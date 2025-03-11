const Campaign = require('../models/campaign.model');
const Event = require('../models/event.model');
const Email = require('../models/email.model');
const Template = require('../models/template.model');
const User = require('../models/user.model');
const emailService = require('./email.service');
const { logger } = require('../utils/logger');

/**
 * Process an event and trigger appropriate campaigns
 * @param {Object} event - The event object
 * @returns {Promise<Array>} - Campaigns that were triggered
 */
const processEvent = async (event) => {
  try {
    // Find campaigns that match this event type and are active
    const campaigns = await Campaign.find({
      triggerEvent: event.eventType,
      status: 'active',
    });

    if (!campaigns || campaigns.length === 0) {
      logger.info(`No active campaigns found for event type: ${event.eventType}`);
      await Event.findByIdAndUpdate(event._id, { processed: true });
      return [];
    }

    // Get the user from the database
    const user = await User.findById(event.userId);
    if (!user) {
      logger.error(`User not found for event: ${event._id}`);
      await Event.findByIdAndUpdate(event._id, { processed: true });
      return [];
    }

    // Process each campaign to see if it should be triggered
    const triggeredCampaigns = [];
    
    for (const campaign of campaigns) {
      // Skip if campaign is not date active
      if (!campaign.isDateActive) {
        continue;
      }
      
      // Skip if the user shouldn't receive this campaign
      if (!campaign.shouldSendToUser(event.userId)) {
        continue;
      }
      
      // Skip if the event doesn't match the campaign conditions
      if (!campaign.matchesConditions(event)) {
        continue;
      }
      
      // Campaign should be triggered
      try {
        // Calculate when the email should be sent
        const scheduledTime = new Date(event.timestamp.getTime() + (campaign.delay * 1000));
        
        // Add campaign to the triggered list
        triggeredCampaigns.push(campaign);
        
        // Add triggered campaign to the event
        await event.addTriggeredCampaign(
          campaign._id,
          'scheduled',
          scheduledTime
        );
        
        // Schedule the email
        await scheduleEmail(campaign, event, user, scheduledTime);
        
        logger.info(`Campaign ${campaign.name} (${campaign._id}) triggered by event ${event._id}`);
      } catch (error) {
        logger.error(`Error processing campaign ${campaign._id} for event ${event._id}:`, error);
      }
    }
    
    // Mark the event as processed
    await Event.findByIdAndUpdate(event._id, { processed: true });
    
    return triggeredCampaigns;
  } catch (error) {
    logger.error(`Error processing event ${event._id}:`, error);
    throw error;
  }
};

/**
 * Schedule an email to be sent
 * @param {Object} campaign - The campaign that triggered the email
 * @param {Object} event - The event that triggered the campaign
 * @param {Object} user - The user receiving the email
 * @param {Date} scheduledTime - When to send the email
 * @returns {Promise<Object>} - Created email object
 */
const scheduleEmail = async (campaign, event, user, scheduledTime) => {
  try {
    // Get the template
    const template = await Template.findById(campaign.templateId);
    
    if (!template) {
      throw new Error(`Template ${campaign.templateId} not found for campaign ${campaign._id}`);
    }
    
    // Prepare variables for the template
    const variables = {
      ...campaign.defaultVariables,
      user_name: user.name,
      user_email: user.email,
      company_name: process.env.EMAIL_FROM_NAME || '',
      unsubscribe_link: `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/unsubscribe/${user._id}`,
    };
    
    // Add user attributes as variables
    if (user.attributes) {
      Object.entries(user.attributes).forEach(([key, value]) => {
        variables[`user_${key}`] = value;
      });
    }
    
    // Add event metadata as variables
    if (event.metadata) {
      Object.entries(event.metadata).forEach(([key, value]) => {
        // Only add primitive values
        if (typeof value !== 'object') {
          variables[`event_${key}`] = value;
        }
      });
    }
    
    // Render the template
    const subject = emailService.renderTemplate(template.subject, variables);
    const body = emailService.renderTemplate(template.body, variables);
    
    // Add tracking for HTML emails
    let links = [];
    let trackingHtml = body;
    
    if (template.isHtml) {
      const trackingId = `${campaign._id}-${event._id}-${Date.now()}`;
      const trackingBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
      
      const trackingInfo = emailService.addTracking(body, trackingId, trackingBaseUrl);
      trackingHtml = trackingInfo.html;
      links = trackingInfo.links;
    }
    
    // Create the email record
    const email = new Email({
      userId: user._id,
      to: user.email,
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
      subject,
      body: trackingHtml,
      isHtml: template.isHtml,
      templateId: template._id,
      campaignId: campaign._id,
      eventId: event._id,
      status: 'scheduled',
      scheduledFor: scheduledTime,
      variables,
      links,
    });
    
    await email.save();
    
    logger.info(`Scheduled email ${email._id} to ${user.email} for ${scheduledTime}`);
    
    return email;
  } catch (error) {
    logger.error('Error scheduling email:', error);
    throw error;
  }
};

/**
 * Process scheduled emails and send them
 * @param {number} batchSize - Number of emails to process at once
 * @returns {Promise<number>} - Number of emails sent
 */
const processScheduledEmails = async (batchSize = 10) => {
  try {
    // Find emails that are scheduled to be sent now
    const pendingEmails = await Email.findPendingEmails(batchSize);
    
    if (!pendingEmails || pendingEmails.length === 0) {
      return 0;
    }
    
    let sentCount = 0;
    
    for (const email of pendingEmails) {
      try {
        // Mark as sending
        email.status = 'sending';
        await email.save();
        
        // Send the email
        const result = await emailService.sendEmail({
          to: email.to,
          from: email.from,
          subject: email.subject,
          body: email.body,
          isHtml: email.isHtml,
        });
        
        // Update the email record
        await email.updateStatus('sent', {
          sentAt: new Date(),
          messageId: result.messageId,
        });
        
        // Update campaign analytics
        await Campaign.findByIdAndUpdate(email.campaignId, {
          $inc: { 'analytics.sent': 1 }
        });
        
        sentCount++;
      } catch (error) {
        logger.error(`Error sending email ${email._id}:`, error);
        
        // Mark as failed
        await email.updateStatus('failed', {
          errorMessage: error.message,
        });
        
        // Update campaign analytics
        await Campaign.findByIdAndUpdate(email.campaignId, {
          $inc: { 'analytics.bounced': 1 }
        });
      }
    }
    
    return sentCount;
  } catch (error) {
    logger.error('Error processing scheduled emails:', error);
    throw error;
  }
};

/**
 * Process unprocessed events
 * @param {number} batchSize - Number of events to process at once
 * @returns {Promise<number>} - Number of events processed
 */
const processUnprocessedEvents = async (batchSize = 100) => {
  try {
    // Find unprocessed events
    const events = await Event.find({ processed: false })
      .sort({ timestamp: 1 })
      .limit(batchSize);
    
    if (!events || events.length === 0) {
      return 0;
    }
    
    let processedCount = 0;
    
    for (const event of events) {
      try {
        await processEvent(event);
        processedCount++;
      } catch (error) {
        logger.error(`Error processing event ${event._id}:`, error);
      }
    }
    
    return processedCount;
  } catch (error) {
    logger.error('Error processing unprocessed events:', error);
    throw error;
  }
};

/**
 * Track an email open
 * @param {string} trackingId - The tracking ID
 * @returns {Promise<Object>} - Updated email
 */
const trackEmailOpen = async (trackingId) => {
  try {
    const email = await Email.findOne({ trackingId });
    
    if (!email) {
      logger.warn(`Email not found for tracking ID: ${trackingId}`);
      return null;
    }
    
    // Only update if not already opened
    if (email.status !== 'opened') {
      await email.updateStatus('opened');
      
      // Update campaign analytics
      await Campaign.findByIdAndUpdate(email.campaignId, {
        $inc: { 'analytics.opened': 1 }
      });
    }
    
    return email;
  } catch (error) {
    logger.error(`Error tracking email open for ${trackingId}:`, error);
    throw error;
  }
};

/**
 * Track an email link click
 * @param {string} trackingId - The tracking ID
 * @param {number} linkIndex - The index of the clicked link
 * @returns {Promise<Object>} - Updated email and original URL
 */
const trackEmailClick = async (trackingId, linkIndex) => {
  try {
    const email = await Email.findOne({ trackingId });
    
    if (!email) {
      logger.warn(`Email not found for tracking ID: ${trackingId}`);
      return { url: null };
    }
    
    // Track click in email
    await email.trackClick(parseInt(linkIndex, 10));
    
    // Update campaign analytics if first click
    if (email.status !== 'clicked') {
      await Campaign.findByIdAndUpdate(email.campaignId, {
        $inc: { 'analytics.clicked': 1 }
      });
    }
    
    // Get the original URL to redirect to
    const originalUrl = email.links && email.links[linkIndex] 
      ? email.links[linkIndex].original 
      : '/';
    
    return { url: originalUrl, email };
  } catch (error) {
    logger.error(`Error tracking email click for ${trackingId} link ${linkIndex}:`, error);
    throw error;
  }
};

module.exports = {
  processEvent,
  scheduleEmail,
  processScheduledEmails,
  processUnprocessedEvents,
  trackEmailOpen,
  trackEmailClick,
};
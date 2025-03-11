const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');

// Create a transporter
let transporter;

/**
 * Initialize the email service
 */
const initializeEmailService = () => {
  try {
    // Create a transporter object using SMTP
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify connection configuration
    transporter.verify((error) => {
      if (error) {
        logger.error('SMTP connection error:', error);
      } else {
        logger.info('SMTP server is ready to send emails');
      }
    });
  } catch (error) {
    logger.error('Error initializing email service:', error);
    throw error;
  }
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @returns {Promise<Object>} - Nodemailer send response
 */
const sendEmail = async (options) => {
  try {
    if (!transporter) {
      initializeEmailService();
    }

    const mailOptions = {
      from: options.from || `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: options.to,
      subject: options.subject,
      text: options.isHtml ? undefined : options.body,
      html: options.isHtml ? options.body : undefined,
      headers: options.headers || {},
    };

    // Add attachments if they exist
    if (options.attachments && Array.isArray(options.attachments)) {
      mailOptions.attachments = options.attachments;
    }

    // Log email attempt
    logger.info(`Sending email to ${options.to} with subject: ${options.subject}`);

    // Send the email
    const result = await transporter.sendMail(mailOptions);
    
    logger.info(`Email sent: ${result.messageId}`);
    return result;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Render template with variables
 * @param {string} template - The template string
 * @param {Object} variables - The variables to replace
 * @returns {string} - The rendered template
 */
const renderTemplate = (template, variables = {}) => {
  let rendered = template;

  // Replace variables in the template
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(regex, value);
  });

  return rendered;
};

/**
 * Add tracking links and pixels to HTML emails
 * @param {string} html - HTML content
 * @param {string} trackingId - Email tracking ID
 * @param {string} trackingBaseUrl - Base URL for tracking
 * @returns {Object} - HTML with tracking and modified links
 */
const addTracking = (html, trackingId, trackingBaseUrl) => {
  // Add open tracking pixel
  const trackingPixel = `<img src="${trackingBaseUrl}/track/open/${trackingId}" width="1" height="1" alt="" style="display:none;" />`;
  let trackedHtml = html + trackingPixel;

  // Find and replace links with tracked versions
  const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;
  const links = [];
  let match;
  let index = 0;

  // Extract all links
  while ((match = linkRegex.exec(html)) !== null) {
    const originalUrl = match[2];
    if (originalUrl && !originalUrl.startsWith('#') && !originalUrl.startsWith('mailto:')) {
      const trackingUrl = `${trackingBaseUrl}/track/click/${trackingId}/${index}`;
      links.push({
        original: originalUrl,
        tracking: trackingUrl,
      });
      
      // Replace the link in the HTML
      trackedHtml = trackedHtml.replace(
        `href="${originalUrl}"`,
        `href="${trackingUrl}"`
      );
      
      index++;
    }
  }

  return {
    html: trackedHtml,
    links,
  };
};

module.exports = {
  initializeEmailService,
  sendEmail,
  renderTemplate,
  addTracking,
};
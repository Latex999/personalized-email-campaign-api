const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      trim: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    source: {
      type: String,
      trim: true,
      default: 'api',
      description: 'Source of the event (api, website, mobile app, etc.)',
    },
    sessionId: {
      type: String,
      trim: true,
      description: 'Optional session identifier',
    },
    ip: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      description: 'Additional data associated with the event',
    },
    processed: {
      type: Boolean,
      default: false,
      description: 'Whether this event has been processed by campaign triggers',
      index: true,
    },
    triggeredCampaigns: {
      type: [{
        campaignId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Campaign',
        },
        processedAt: {
          type: Date,
        },
        status: {
          type: String,
          enum: ['scheduled', 'sent', 'failed'],
        },
        scheduledFor: {
          type: Date,
        },
        emailId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Email',
        },
        error: {
          type: String,
        },
      }],
      default: [],
      description: 'Campaigns that were triggered by this event',
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound index on eventType and timestamp for efficient queries
eventSchema.index({ eventType: 1, timestamp: -1 });

// Create a compound index on userId and eventType for user-specific event queries
eventSchema.index({ userId: 1, eventType: 1 });

// Add a TTL index if you want events to expire after some time
// eventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // 90 days

// Static method to find recent events by user
eventSchema.statics.findRecentByUser = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static method to find events by type in a date range
eventSchema.statics.findByTypeInDateRange = function(eventType, startDate, endDate, limit = 100) {
  return this.find({
    eventType,
    timestamp: { $gte: startDate, $lte: endDate }
  })
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Method to mark an event as processed
eventSchema.methods.markProcessed = function() {
  this.processed = true;
  return this.save();
};

// Method to add a triggered campaign
eventSchema.methods.addTriggeredCampaign = function(campaignId, status = 'scheduled', scheduledFor = null) {
  this.triggeredCampaigns.push({
    campaignId,
    processedAt: new Date(),
    status,
    scheduledFor: scheduledFor || new Date(),
  });
  
  return this.save();
};

// Method to update campaign status
eventSchema.methods.updateCampaignStatus = function(campaignId, status, emailId = null, error = null) {
  const campaign = this.triggeredCampaigns.find(c => c.campaignId.toString() === campaignId.toString());
  
  if (campaign) {
    campaign.status = status;
    campaign.processedAt = new Date();
    
    if (emailId) {
      campaign.emailId = emailId;
    }
    
    if (error) {
      campaign.error = error;
    }
    
    return this.save();
  }
  
  return Promise.resolve(this);
};

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
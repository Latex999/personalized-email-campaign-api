const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    to: {
      type: String,
      required: [true, 'Recipient email is required'],
      trim: true,
    },
    from: {
      type: String,
      required: [true, 'Sender email is required'],
      trim: true,
    },
    subject: {
      type: String,
      required: [true, 'Email subject is required'],
      trim: true,
    },
    body: {
      type: String,
      required: [true, 'Email body is required'],
    },
    isHtml: {
      type: Boolean,
      default: false,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
      required: [true, 'Template ID is required'],
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: [true, 'Campaign ID is required'],
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      description: 'Event that triggered this email, if any',
      index: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'sending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'rejected', 'failed', 'complained', 'unsubscribed'],
      default: 'scheduled',
      index: true,
    },
    scheduledFor: {
      type: Date,
      default: Date.now,
      index: true,
    },
    sentAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    openedAt: {
      type: Date,
    },
    clickedAt: {
      type: Date,
    },
    variables: {
      type: Map,
      of: String,
      default: {},
      description: 'Template variables used in this email',
    },
    messageId: {
      type: String,
      trim: true,
      description: 'Email service provider message ID',
    },
    trackingId: {
      type: String,
      trim: true,
      unique: true,
      description: 'Unique tracking ID for this email',
    },
    links: [{
      original: String,
      tracking: String,
      clicks: {
        type: Number,
        default: 0,
      },
      lastClickedAt: Date,
    }],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    errorMessage: {
      type: String,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for faster lookups
emailSchema.index({ userId: 1, status: 1 });
emailSchema.index({ scheduledFor: 1, status: 1 });
emailSchema.index({ campaignId: 1, status: 1 });

// Pre-save hook to generate tracking ID if not already set
emailSchema.pre('save', function(next) {
  if (!this.trackingId) {
    this.trackingId = mongoose.Types.ObjectId().toString() + Date.now().toString(36);
  }
  next();
});

// Static method to find emails pending to be sent
emailSchema.statics.findPendingEmails = function(limit = 100) {
  const now = new Date();
  
  return this.find({
    status: 'scheduled',
    scheduledFor: { $lte: now }
  })
    .sort({ scheduledFor: 1 })
    .limit(limit);
};

// Static method to find emails by campaign
emailSchema.statics.findByCampaign = function(campaignId, limit = 100, skip = 0) {
  return this.find({ campaignId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get campaign statistics
emailSchema.statics.getCampaignStats = async function(campaignId) {
  return this.aggregate([
    { $match: { campaignId: mongoose.Types.ObjectId(campaignId) } },
    { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    },
    { $project: {
        status: '$_id',
        count: 1,
        _id: 0
      }
    }
  ]);
};

// Method to update email status
emailSchema.methods.updateStatus = function(status, additionalData = {}) {
  this.status = status;
  
  // Update timestamp based on status
  const now = new Date();
  
  switch (status) {
    case 'sent':
      this.sentAt = now;
      break;
    case 'delivered':
      this.deliveredAt = now;
      break;
    case 'opened':
      this.openedAt = now;
      break;
    case 'clicked':
      this.clickedAt = now;
      break;
  }
  
  // Add any additional data
  Object.keys(additionalData).forEach(key => {
    this[key] = additionalData[key];
  });
  
  return this.save();
};

// Method to track a link click
emailSchema.methods.trackClick = function(linkIndex) {
  if (this.links && this.links[linkIndex]) {
    this.links[linkIndex].clicks += 1;
    this.links[linkIndex].lastClickedAt = new Date();
    
    // Also update the overall email status
    return this.updateStatus('clicked');
  }
  
  return Promise.resolve(this);
};

const Email = mongoose.model('Email', emailSchema);

module.exports = Email;
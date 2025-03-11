const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
      required: [true, 'Template is required for a campaign'],
    },
    triggerEvent: {
      type: String,
      required: [true, 'Trigger event is required'],
      trim: true,
    },
    delay: {
      type: Number,
      default: 0,
      description: 'Delay in seconds before sending the email after the event occurs',
    },
    conditions: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      description: 'Conditions that need to be met for the email to be sent',
    },
    audience: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }],
      default: [],
      description: 'Specific users to target; empty means all users',
    },
    excludedAudience: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }],
      default: [],
      description: 'Users to exclude from the campaign',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      description: 'Campaign end date; null means indefinite',
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'completed', 'archived'],
      default: 'draft',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    analytics: {
      sent: {
        type: Number,
        default: 0,
      },
      opened: {
        type: Number,
        default: 0,
      },
      clicked: {
        type: Number,
        default: 0,
      },
      bounced: {
        type: Number,
        default: 0,
      },
      unsubscribed: {
        type: Number,
        default: 0,
      },
      complained: {
        type: Number,
        default: 0,
      },
    },
    defaultVariables: {
      type: Map,
      of: String,
      default: {},
      description: 'Default values for template variables',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create indexes for faster lookups
campaignSchema.index({ triggerEvent: 1, status: 1 });
campaignSchema.index({ startDate: 1, endDate: 1 });

// Virtual for checking if a campaign is active based on date range
campaignSchema.virtual('isDateActive').get(function() {
  const now = new Date();
  const isAfterStart = now >= this.startDate;
  const isBeforeEnd = !this.endDate || now <= this.endDate;
  
  return isAfterStart && isBeforeEnd;
});

// Method to check if a user should receive this campaign
campaignSchema.methods.shouldSendToUser = function(userId) {
  // If audience is specified and user is not in it, don't send
  if (this.audience.length > 0 && !this.audience.includes(userId)) {
    return false;
  }
  
  // If user is in excluded audience, don't send
  if (this.excludedAudience.includes(userId)) {
    return false;
  }
  
  return true;
};

// Method to check if an event matches the campaign's conditions
campaignSchema.methods.matchesConditions = function(event) {
  // If no conditions are specified, consider it a match
  if (!this.conditions || Object.keys(this.conditions).length === 0) {
    return true;
  }
  
  // Simple condition matching - can be extended for more complex conditions
  for (const [key, value] of Object.entries(this.conditions)) {
    // Handle dot notation for nested properties
    const keyParts = key.split('.');
    let eventValue = event;
    
    for (const part of keyParts) {
      if (!eventValue || !eventValue[part]) {
        return false;
      }
      eventValue = eventValue[part];
    }
    
    // Handle different types of conditions
    if (typeof value === 'object') {
      // Complex condition (exists, gt, lt, etc.)
      if (value.exists !== undefined && !!eventValue !== value.exists) {
        return false;
      }
      
      if (value.equals !== undefined && eventValue !== value.equals) {
        return false;
      }
      
      if (value.gt !== undefined && eventValue <= value.gt) {
        return false;
      }
      
      if (value.lt !== undefined && eventValue >= value.lt) {
        return false;
      }
    } else {
      // Simple equality check
      if (eventValue !== value) {
        return false;
      }
    }
  }
  
  return true;
};

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;
const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      unique: true,
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
    category: {
      type: String,
      trim: true,
      default: 'general',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    variables: [{
      name: {
        type: String,
        required: true,
        trim: true,
      },
      description: {
        type: String,
        trim: true,
      },
      defaultValue: {
        type: String,
      },
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create an index on the name field for faster lookups
templateSchema.index({ name: 1 });

// Method to detect variables in the template
templateSchema.methods.detectVariables = function() {
  const regex = /\{\{([^}]+)\}\}/g;
  const variables = new Set();
  let match;
  
  // Find all variables in the subject
  while ((match = regex.exec(this.subject)) !== null) {
    variables.add(match[1].trim());
  }
  
  // Reset regex index
  regex.lastIndex = 0;
  
  // Find all variables in the body
  while ((match = regex.exec(this.body)) !== null) {
    variables.add(match[1].trim());
  }
  
  return Array.from(variables);
};

// Pre-save hook to extract variables from the template
templateSchema.pre('save', function(next) {
  const detectedVariables = this.detectVariables();
  
  // Update the variables array with any new variables
  const existingVarNames = this.variables.map(v => v.name);
  
  // Add any new variables that were detected but not already in the array
  detectedVariables.forEach(varName => {
    if (!existingVarNames.includes(varName)) {
      this.variables.push({
        name: varName,
        description: `Variable for ${varName}`,
        defaultValue: '',
      });
    }
  });
  
  next();
});

const Template = mongoose.model('Template', templateSchema);

module.exports = Template;
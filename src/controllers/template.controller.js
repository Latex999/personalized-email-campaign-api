const Template = require('../models/template.model');
const { logger } = require('../utils/logger');

/**
 * Create a new email template
 * @route POST /api/templates
 */
const createTemplate = async (req, res) => {
  try {
    const newTemplate = await Template.create({
      name: req.body.name,
      subject: req.body.subject,
      body: req.body.body,
      isHtml: req.body.isHtml || false,
      category: req.body.category || 'general',
      createdBy: req.user._id,
      tags: req.body.tags || [],
    });
    
    res.status(201).json({
      status: 'success',
      message: 'Template created successfully',
      data: {
        template: newTemplate,
      },
    });
  } catch (error) {
    logger.error('Error creating template:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'A template with this name already exists',
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to create template',
      error: error.message,
    });
  }
};

/**
 * Get all templates
 * @route GET /api/templates
 */
const getAllTemplates = async (req, res) => {
  try {
    // Build query
    const queryObj = {};
    
    // Filter by category
    if (req.query.category) {
      queryObj.category = req.query.category;
    }
    
    // Filter by tags
    if (req.query.tag) {
      queryObj.tags = req.query.tag;
    }
    
    // Filter by active status
    if (req.query.active) {
      queryObj.isActive = req.query.active === 'true';
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    // Execute query
    const templates = await Template.find(queryObj)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email');
    
    // Get total count
    const total = await Template.countDocuments(queryObj);
    
    res.status(200).json({
      status: 'success',
      results: templates.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      data: {
        templates,
      },
    });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch templates',
      error: error.message,
    });
  }
};

/**
 * Get a template by ID
 * @route GET /api/templates/:id
 */
const getTemplateById = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id)
      .populate('createdBy', 'name email');
    
    if (!template) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found',
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        template,
      },
    });
  } catch (error) {
    logger.error(`Error fetching template ${req.params.id}:`, error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch template',
      error: error.message,
    });
  }
};

/**
 * Update a template
 * @route PATCH /api/templates/:id
 */
const updateTemplate = async (req, res) => {
  try {
    // Find the template
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found',
      });
    }
    
    // Check if user is the creator or an admin
    if (template.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to update this template',
      });
    }
    
    // Fields that are allowed to be updated
    const allowedFields = ['name', 'subject', 'body', 'isHtml', 'category', 'tags', 'isActive'];
    
    // Filter the request body to only include allowed fields
    const filteredBody = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredBody[key] = req.body[key];
      }
    });
    
    // Update the template
    const updatedTemplate = await Template.findByIdAndUpdate(
      req.params.id,
      filteredBody,
      {
        new: true,
        runValidators: true,
      }
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Template updated successfully',
      data: {
        template: updatedTemplate,
      },
    });
  } catch (error) {
    logger.error(`Error updating template ${req.params.id}:`, error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update template',
      error: error.message,
    });
  }
};

/**
 * Delete a template
 * @route DELETE /api/templates/:id
 */
const deleteTemplate = async (req, res) => {
  try {
    // Find the template
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found',
      });
    }
    
    // Check if user is the creator or an admin
    if (template.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to delete this template',
      });
    }
    
    // Delete the template
    await Template.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      status: 'success',
      message: 'Template deleted successfully',
      data: null,
    });
  } catch (error) {
    logger.error(`Error deleting template ${req.params.id}:`, error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete template',
      error: error.message,
    });
  }
};

/**
 * Preview a template with variables
 * @route POST /api/templates/:id/preview
 */
const previewTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found',
      });
    }
    
    // Get variables from request body
    const variables = req.body.variables || {};
    
    // Replace variables in the template
    let subject = template.subject;
    let body = template.body;
    
    // Simple variable replacement
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        subject,
        body,
        isHtml: template.isHtml,
      },
    });
  } catch (error) {
    logger.error(`Error previewing template ${req.params.id}:`, error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to preview template',
      error: error.message,
    });
  }
};

module.exports = {
  createTemplate,
  getAllTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
};
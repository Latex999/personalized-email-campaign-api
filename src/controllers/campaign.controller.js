const Campaign = require('../models/campaign.model');
const Email = require('../models/email.model');
const { logger } = require('../utils/logger');

/**
 * Create a new campaign
 * @route POST /api/campaigns
 */
const createCampaign = async (req, res) => {
  try {
    const newCampaign = await Campaign.create({
      name: req.body.name,
      description: req.body.description,
      templateId: req.body.templateId,
      triggerEvent: req.body.triggerEvent,
      delay: req.body.delay || 0,
      conditions: req.body.conditions || {},
      audience: req.body.audience || [],
      excludedAudience: req.body.excludedAudience || [],
      startDate: req.body.startDate || new Date(),
      endDate: req.body.endDate || null,
      status: req.body.status || 'draft',
      createdBy: req.user._id,
      metadata: req.body.metadata || {},
      defaultVariables: req.body.defaultVariables || {},
    });
    
    res.status(201).json({
      status: 'success',
      message: 'Campaign created successfully',
      data: {
        campaign: newCampaign,
      },
    });
  } catch (error) {
    logger.error('Error creating campaign:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'A campaign with this name already exists',
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to create campaign',
      error: error.message,
    });
  }
};

/**
 * Get all campaigns
 * @route GET /api/campaigns
 */
const getAllCampaigns = async (req, res) => {
  try {
    // Build query
    const queryObj = {};
    
    // Filter by trigger event
    if (req.query.triggerEvent) {
      queryObj.triggerEvent = req.query.triggerEvent;
    }
    
    // Filter by status
    if (req.query.status) {
      queryObj.status = req.query.status;
    }
    
    // Filter campaigns created by this user (unless admin)
    if (req.user.role !== 'admin') {
      queryObj.createdBy = req.user._id;
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    // Execute query
    const campaigns = await Campaign.find(queryObj)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('templateId', 'name subject')
      .populate('createdBy', 'name email');
    
    // Get total count
    const total = await Campaign.countDocuments(queryObj);
    
    res.status(200).json({
      status: 'success',
      results: campaigns.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      data: {
        campaigns,
      },
    });
  } catch (error) {
    logger.error('Error fetching campaigns:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch campaigns',
      error: error.message,
    });
  }
};

/**
 * Get a campaign by ID
 * @route GET /api/campaigns/:id
 */
const getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('templateId')
      .populate('createdBy', 'name email');
    
    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found',
      });
    }
    
    // Check if user has permission to view this campaign
    if (req.user.role !== 'admin' && campaign.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to view this campaign',
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        campaign,
      },
    });
  } catch (error) {
    logger.error(`Error fetching campaign ${req.params.id}:`, error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch campaign',
      error: error.message,
    });
  }
};

/**
 * Update a campaign
 * @route PATCH /api/campaigns/:id
 */
const updateCampaign = async (req, res) => {
  try {
    // Find the campaign
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found',
      });
    }
    
    // Check if user is the creator or an admin
    if (campaign.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to update this campaign',
      });
    }
    
    // Fields that are allowed to be updated
    const allowedFields = [
      'name',
      'description',
      'templateId',
      'triggerEvent',
      'delay',
      'conditions',
      'audience',
      'excludedAudience',
      'startDate',
      'endDate',
      'status',
      'metadata',
      'defaultVariables',
    ];
    
    // Filter the request body to only include allowed fields
    const filteredBody = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredBody[key] = req.body[key];
      }
    });
    
    // Update the campaign
    const updatedCampaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      filteredBody,
      {
        new: true,
        runValidators: true,
      }
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Campaign updated successfully',
      data: {
        campaign: updatedCampaign,
      },
    });
  } catch (error) {
    logger.error(`Error updating campaign ${req.params.id}:`, error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update campaign',
      error: error.message,
    });
  }
};

/**
 * Delete a campaign
 * @route DELETE /api/campaigns/:id
 */
const deleteCampaign = async (req, res) => {
  try {
    // Find the campaign
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found',
      });
    }
    
    // Check if user is the creator or an admin
    if (campaign.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to delete this campaign',
      });
    }
    
    // Delete the campaign
    await Campaign.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      status: 'success',
      message: 'Campaign deleted successfully',
      data: null,
    });
  } catch (error) {
    logger.error(`Error deleting campaign ${req.params.id}:`, error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete campaign',
      error: error.message,
    });
  }
};

/**
 * Get campaign analytics
 * @route GET /api/campaigns/:id/analytics
 */
const getCampaignAnalytics = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found',
      });
    }
    
    // Check if user has permission to view this campaign
    if (req.user.role !== 'admin' && campaign.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to view this campaign',
      });
    }
    
    // Get email stats
    const emailStats = await Email.getCampaignStats(campaign._id);
    
    // Format the stats
    const stats = {};
    emailStats.forEach((stat) => {
      stats[stat.status] = stat.count;
    });
    
    // Get total emails
    const totalEmails = await Email.countDocuments({ campaignId: campaign._id });
    
    // Calculate rates
    const rates = {
      deliveryRate: stats.delivered ? (stats.delivered / totalEmails) * 100 : 0,
      openRate: stats.opened ? (stats.opened / (stats.delivered || totalEmails)) * 100 : 0,
      clickRate: stats.clicked ? (stats.clicked / (stats.opened || 1)) * 100 : 0,
      bounceRate: stats.bounced ? (stats.bounced / totalEmails) * 100 : 0,
    };
    
    res.status(200).json({
      status: 'success',
      data: {
        campaign: campaign.name,
        stats: {
          ...campaign.analytics,
          ...stats,
        },
        rates,
        totalEmails,
      },
    });
  } catch (error) {
    logger.error(`Error fetching campaign analytics ${req.params.id}:`, error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch campaign analytics',
      error: error.message,
    });
  }
};

/**
 * Activate a campaign
 * @route PATCH /api/campaigns/:id/activate
 */
const activateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found',
      });
    }
    
    // Check if user is the creator or an admin
    if (campaign.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to activate this campaign',
      });
    }
    
    // Update status to active
    campaign.status = 'active';
    await campaign.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Campaign activated successfully',
      data: {
        campaign,
      },
    });
  } catch (error) {
    logger.error(`Error activating campaign ${req.params.id}:`, error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to activate campaign',
      error: error.message,
    });
  }
};

/**
 * Pause a campaign
 * @route PATCH /api/campaigns/:id/pause
 */
const pauseCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found',
      });
    }
    
    // Check if user is the creator or an admin
    if (campaign.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to pause this campaign',
      });
    }
    
    // Update status to paused
    campaign.status = 'paused';
    await campaign.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Campaign paused successfully',
      data: {
        campaign,
      },
    });
  } catch (error) {
    logger.error(`Error pausing campaign ${req.params.id}:`, error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to pause campaign',
      error: error.message,
    });
  }
};

module.exports = {
  createCampaign,
  getAllCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  getCampaignAnalytics,
  activateCampaign,
  pauseCampaign,
};
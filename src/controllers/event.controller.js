const Event = require('../models/event.model');
const campaignService = require('../services/campaign.service');
const { logger } = require('../utils/logger');

/**
 * Track a user event
 * @route POST /api/events
 */
const trackEvent = async (req, res) => {
  try {
    // Extract data from request
    const {
      userId,
      eventType,
      metadata,
      sessionId,
      source
    } = req.body;
    
    // Validate required fields
    if (!userId || !eventType) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID and event type are required',
      });
    }
    
    // Create the event
    const event = new Event({
      userId,
      eventType,
      metadata: metadata || {},
      sessionId,
      source: source || 'api',
      ip: req.ip,
      userAgent: req.get('user-agent'),
      processed: false,
    });
    
    await event.save();
    
    // Process the event asynchronously
    // This is done in the background to not block the response
    setTimeout(async () => {
      try {
        await campaignService.processEvent(event);
      } catch (error) {
        logger.error(`Error processing event ${event._id}:`, error);
      }
    }, 0);
    
    res.status(201).json({
      status: 'success',
      message: 'Event tracked successfully',
      data: {
        eventId: event._id,
      },
    });
  } catch (error) {
    logger.error('Error tracking event:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to track event',
      error: error.message,
    });
  }
};

/**
 * Get events for a user
 * @route GET /api/events/user/:userId
 */
const getUserEvents = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user has permission to view these events
    if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to view these events',
      });
    }
    
    // Build query
    const queryObj = { userId };
    
    // Filter by event type
    if (req.query.eventType) {
      queryObj.eventType = req.query.eventType;
    }
    
    // Filter by date range
    if (req.query.startDate || req.query.endDate) {
      queryObj.timestamp = {};
      
      if (req.query.startDate) {
        queryObj.timestamp.$gte = new Date(req.query.startDate);
      }
      
      if (req.query.endDate) {
        queryObj.timestamp.$lte = new Date(req.query.endDate);
      }
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    
    // Execute query
    const events = await Event.find(queryObj)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const total = await Event.countDocuments(queryObj);
    
    res.status(200).json({
      status: 'success',
      results: events.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      data: {
        events,
      },
    });
  } catch (error) {
    logger.error(`Error fetching events for user ${req.params.userId}:`, error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch events',
      error: error.message,
    });
  }
};

/**
 * Get event analytics
 * @route GET /api/events/analytics
 */
const getEventAnalytics = async (req, res) => {
  try {
    // Only admins can access analytics
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to view analytics',
      });
    }
    
    // Set up date range
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(endDate);
    
    // Default to last 30 days if no date range provided
    if (!req.query.startDate) {
      startDate.setDate(startDate.getDate() - 30);
    }
    
    // Get event counts by type
    const eventsByType = await Event.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);
    
    // Get event counts by day
    const eventsByDay = await Event.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day',
            },
          },
          count: 1,
        },
      },
    ]);
    
    // Get total events
    const totalEvents = await Event.countDocuments({
      timestamp: { $gte: startDate, $lte: endDate },
    });
    
    // Get unique users
    const uniqueUsers = await Event.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$userId',
        },
      },
      {
        $count: 'uniqueUsers',
      },
    ]);
    
    res.status(200).json({
      status: 'success',
      data: {
        totalEvents,
        uniqueUsers: uniqueUsers.length > 0 ? uniqueUsers[0].uniqueUsers : 0,
        eventsByType,
        eventsByDay,
        dateRange: {
          startDate,
          endDate,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching event analytics:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch event analytics',
      error: error.message,
    });
  }
};

/**
 * Get a single event by ID
 * @route GET /api/events/:id
 */
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found',
      });
    }
    
    // Check if user has permission to view this event
    if (req.user.role !== 'admin' && req.user._id.toString() !== event.userId.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You are not authorized to view this event',
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        event,
      },
    });
  } catch (error) {
    logger.error(`Error fetching event ${req.params.id}:`, error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch event',
      error: error.message,
    });
  }
};

module.exports = {
  trackEvent,
  getUserEvents,
  getEventAnalytics,
  getEventById,
};
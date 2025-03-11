const express = require('express');
const eventController = require('../controllers/event.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Track a user event
 *     tags: [Events]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - eventType
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID
 *               eventType:
 *                 type: string
 *                 description: Type of event (e.g., page_view, product_click)
 *               metadata:
 *                 type: object
 *                 description: Additional data about the event
 *               sessionId:
 *                 type: string
 *                 description: Optional session identifier
 *               source:
 *                 type: string
 *                 description: Source of the event (e.g., web, mobile)
 *     responses:
 *       201:
 *         description: Event tracked successfully
 *       400:
 *         description: User ID and event type are required
 *       500:
 *         description: Server error
 */
router.post('/', eventController.trackEvent);

// Protect all remaining routes
router.use(authenticate);

/**
 * @swagger
 * /api/events/user/{userId}:
 *   get:
 *     summary: Get events for a user
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *         description: Filter by event type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Results per page
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/user/:userId', eventController.getUserEvents);

/**
 * @swagger
 * /api/events/analytics:
 *   get:
 *     summary: Get event analytics
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 *       500:
 *         description: Server error
 */
router.get('/analytics', authorize('admin'), eventController.getEventAnalytics);

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get a single event by ID
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event retrieved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.get('/:id', eventController.getEventById);

module.exports = router;
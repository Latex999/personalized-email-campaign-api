const express = require('express');
const trackingController = require('../controllers/tracking.controller');

const router = express.Router();

/**
 * @swagger
 * /api/track/open/{trackingId}:
 *   get:
 *     summary: Track email opens
 *     tags: [Tracking]
 *     parameters:
 *       - in: path
 *         name: trackingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Email tracking ID
 *     responses:
 *       200:
 *         description: Returns a 1x1 transparent GIF
 *         content:
 *           image/gif:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/open/:trackingId', trackingController.trackEmailOpen);

/**
 * @swagger
 * /api/track/click/{trackingId}/{linkIndex}:
 *   get:
 *     summary: Track email link clicks
 *     tags: [Tracking]
 *     parameters:
 *       - in: path
 *         name: trackingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Email tracking ID
 *       - in: path
 *         name: linkIndex
 *         required: true
 *         schema:
 *           type: string
 *         description: Index of the clicked link
 *     responses:
 *       302:
 *         description: Redirects to the original URL
 */
router.get('/click/:trackingId/:linkIndex', trackingController.trackEmailClick);

/**
 * @swagger
 * /api/unsubscribe/{userId}:
 *   get:
 *     summary: Handle unsubscribe requests
 *     tags: [Tracking]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: User email address
 *       - in: query
 *         name: campaign
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Unsubscribe confirmation page
 *       500:
 *         description: Error page
 */
router.get('/unsubscribe/:userId', trackingController.handleUnsubscribe);

module.exports = router;
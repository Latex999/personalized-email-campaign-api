const express = require('express');
const campaignController = require('../controllers/campaign.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Protect all routes
router.use(authenticate);

/**
 * @swagger
 * /api/campaigns:
 *   post:
 *     summary: Create a new campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - templateId
 *               - triggerEvent
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               templateId:
 *                 type: string
 *               triggerEvent:
 *                 type: string
 *               delay:
 *                 type: number
 *                 description: Delay in seconds before sending email
 *               conditions:
 *                 type: object
 *                 description: Conditions for triggering the campaign
 *               audience:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Specific users to target (empty means all users)
 *               excludedAudience:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Users to exclude from the campaign
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [draft, active, paused, completed, archived]
 *               defaultVariables:
 *                 type: object
 *                 description: Default values for template variables
 *     responses:
 *       201:
 *         description: Campaign created successfully
 *       400:
 *         description: Campaign with this name already exists
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.post('/', campaignController.createCampaign);

/**
 * @swagger
 * /api/campaigns:
 *   get:
 *     summary: Get all campaigns
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: triggerEvent
 *         schema:
 *           type: string
 *         description: Filter by trigger event
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
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
 *         description: Campaigns retrieved successfully
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get('/', campaignController.getAllCampaigns);

/**
 * @swagger
 * /api/campaigns/{id}:
 *   get:
 *     summary: Get a campaign by ID
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Campaign retrieved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Campaign not found
 *       500:
 *         description: Server error
 */
router.get('/:id', campaignController.getCampaignById);

/**
 * @swagger
 * /api/campaigns/{id}:
 *   patch:
 *     summary: Update a campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               templateId:
 *                 type: string
 *               triggerEvent:
 *                 type: string
 *               delay:
 *                 type: number
 *               conditions:
 *                 type: object
 *               audience:
 *                 type: array
 *                 items:
 *                   type: string
 *               excludedAudience:
 *                 type: array
 *                 items:
 *                   type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [draft, active, paused, completed, archived]
 *               defaultVariables:
 *                 type: object
 *     responses:
 *       200:
 *         description: Campaign updated successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Campaign not found
 *       500:
 *         description: Server error
 */
router.patch('/:id', campaignController.updateCampaign);

/**
 * @swagger
 * /api/campaigns/{id}:
 *   delete:
 *     summary: Delete a campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Campaign deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Campaign not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', campaignController.deleteCampaign);

/**
 * @swagger
 * /api/campaigns/{id}/analytics:
 *   get:
 *     summary: Get campaign analytics
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Campaign not found
 *       500:
 *         description: Server error
 */
router.get('/:id/analytics', campaignController.getCampaignAnalytics);

/**
 * @swagger
 * /api/campaigns/{id}/activate:
 *   patch:
 *     summary: Activate a campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Campaign activated successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Campaign not found
 *       500:
 *         description: Server error
 */
router.patch('/:id/activate', campaignController.activateCampaign);

/**
 * @swagger
 * /api/campaigns/{id}/pause:
 *   patch:
 *     summary: Pause a campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Campaign paused successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Campaign not found
 *       500:
 *         description: Server error
 */
router.patch('/:id/pause', campaignController.pauseCampaign);

module.exports = router;
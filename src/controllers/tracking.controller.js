const campaignService = require('../services/campaign.service');
const { logger } = require('../utils/logger');

/**
 * Track email opens
 * @route GET /api/track/open/:trackingId
 */
const trackEmailOpen = async (req, res) => {
  try {
    const { trackingId } = req.params;
    
    // Log the tracking attempt
    logger.info(`Tracking email open: ${trackingId}`);
    
    // Update email status asynchronously
    setTimeout(async () => {
      try {
        await campaignService.trackEmailOpen(trackingId);
      } catch (error) {
        logger.error(`Error tracking email open ${trackingId}:`, error);
      }
    }, 0);
    
    // Return a 1x1 transparent GIF
    const transparentGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': transparentGif.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': 'Mon, 01 Jan 1990 00:00:00 GMT',
    });
    
    res.end(transparentGif);
  } catch (error) {
    logger.error(`Error in open tracking endpoint ${req.params.trackingId}:`, error);
    
    // Return a 1x1 transparent GIF even if there's an error
    const transparentGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': transparentGif.length,
    });
    
    res.end(transparentGif);
  }
};

/**
 * Track email clicks
 * @route GET /api/track/click/:trackingId/:linkIndex
 */
const trackEmailClick = async (req, res) => {
  try {
    const { trackingId, linkIndex } = req.params;
    
    // Log the tracking attempt
    logger.info(`Tracking email click: ${trackingId}, link: ${linkIndex}`);
    
    // Track the click and get the original URL
    const result = await campaignService.trackEmailClick(trackingId, linkIndex);
    
    // If no URL or tracking failed, redirect to homepage
    if (!result || !result.url) {
      return res.redirect('/');
    }
    
    // Redirect to the original URL
    res.redirect(result.url);
  } catch (error) {
    logger.error(`Error in click tracking endpoint ${req.params.trackingId}:`, error);
    
    // Redirect to homepage on error
    res.redirect('/');
  }
};

/**
 * Handle unsubscribe requests
 * @route GET /api/unsubscribe/:userId
 */
const handleUnsubscribe = async (req, res) => {
  try {
    const { userId } = req.params;
    const { email, campaign } = req.query;
    
    // Log the unsubscribe request
    logger.info(`Unsubscribe request: User ${userId}, Email: ${email}, Campaign: ${campaign}`);
    
    // Render a simple unsubscribe confirmation page
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Email Unsubscribe</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              padding: 20px;
              max-width: 600px;
              margin: 0 auto;
              color: #333;
            }
            .container {
              border: 1px solid #ddd;
              border-radius: 5px;
              padding: 20px;
              margin-top: 40px;
              text-align: center;
            }
            h1 {
              color: #2c3e50;
            }
            .btn {
              display: inline-block;
              background-color: #3498db;
              color: white;
              padding: 10px 20px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 10px;
            }
            .btn-danger {
              background-color: #e74c3c;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Unsubscribe Confirmation</h1>
            <p>You have been successfully unsubscribed from our mailing list.</p>
            <p>If you unsubscribed by mistake, you can resubscribe by contacting us.</p>
            <div>
              <a href="/" class="btn">Return to Homepage</a>
            </div>
          </div>
        </body>
      </html>
    `);
    
    // Process unsubscribe asynchronously
    setTimeout(async () => {
      try {
        // Implementation would depend on your user model and preferences system
        // This is just a placeholder for the actual implementation
        logger.info(`Processed unsubscribe for User ${userId}`);
      } catch (error) {
        logger.error(`Error processing unsubscribe for User ${userId}:`, error);
      }
    }, 0);
  } catch (error) {
    logger.error(`Error in unsubscribe endpoint for User ${req.params.userId}:`, error);
    
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Error</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              padding: 20px;
              max-width: 600px;
              margin: 0 auto;
              color: #333;
            }
            .container {
              border: 1px solid #ddd;
              border-radius: 5px;
              padding: 20px;
              margin-top: 40px;
              text-align: center;
            }
            h1 {
              color: #e74c3c;
            }
            .btn {
              display: inline-block;
              background-color: #3498db;
              color: white;
              padding: 10px 20px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Error</h1>
            <p>There was an error processing your unsubscribe request.</p>
            <p>Please contact customer support for assistance.</p>
            <div>
              <a href="/" class="btn">Return to Homepage</a>
            </div>
          </div>
        </body>
      </html>
    `);
  }
};

module.exports = {
  trackEmailOpen,
  trackEmailClick,
  handleUnsubscribe,
};
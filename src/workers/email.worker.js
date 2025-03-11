const mongoose = require('mongoose');
const dotenv = require('dotenv');
const campaignService = require('../services/campaign.service');
const { logger } = require('../utils/logger');

// Load environment variables
dotenv.config();

/**
 * Process scheduled emails
 */
const processEmails = async () => {
  try {
    logger.info('Starting email processing job');
    
    // Process emails in batches
    const batchSize = process.env.EMAIL_BATCH_SIZE || 10;
    const emailsSent = await campaignService.processScheduledEmails(parseInt(batchSize, 10));
    
    logger.info(`Processed ${emailsSent} emails`);
  } catch (error) {
    logger.error('Error processing scheduled emails:', error);
  }
};

/**
 * Process unprocessed events
 */
const processEvents = async () => {
  try {
    logger.info('Starting event processing job');
    
    // Process events in batches
    const batchSize = process.env.EVENT_BATCH_SIZE || 100;
    const eventsProcessed = await campaignService.processUnprocessedEvents(parseInt(batchSize, 10));
    
    logger.info(`Processed ${eventsProcessed} events`);
  } catch (error) {
    logger.error('Error processing events:', error);
  }
};

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    logger.info('MongoDB connected');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

/**
 * Main worker function
 */
const runWorker = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Process events first
    await processEvents();
    
    // Then process emails
    await processEmails();
    
    // Close the connection
    await mongoose.connection.close();
    
    logger.info('Worker completed successfully');
  } catch (error) {
    logger.error('Worker error:', error);
  }
};

// If this script is run directly
if (require.main === module) {
  runWorker()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Fatal error in worker:', error);
      process.exit(1);
    });
}

module.exports = {
  runWorker,
  processEmails,
  processEvents,
};
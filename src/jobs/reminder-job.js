const reminderService = require('../services/reminder-service');
const cron = require('node-cron');

/**
 * Initialize reminder job
 * Runs every hour to check for pending reviews that need reminders
 */
function initializeReminderJob() {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('Running reminder check job...');
    try {
      await reminderService.checkAndSendReminders();
      console.log('Reminder check completed');
    } catch (error) {
      console.error('Error in reminder job:', error);
    }
  });

  console.log('✅ Reminder job initialized (runs every hour)');
}

module.exports = {
  initializeReminderJob,
};

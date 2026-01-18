const { supabase } = require('../database/connection');
const notificationService = require('./notification-service');
const participantService = require('./participant-service');
const reviewCycleModel = require('../models/review-cycle');

/**
 * Get all pending participants who need reminders
 */
async function getPendingParticipantsNeedingReminders(workspaceId, hoursSinceLastReminder = 24) {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - hoursSinceLastReminder);

  const { data, error } = await supabase
    .from('participants')
    .select(`
      *,
      reviewer:users!participants_reviewer_id_fkey(*),
      review_cycle:review_cycles(
        *,
        employee:users!review_cycles_employee_id_fkey(*),
        workspace:workspaces(*)
      )
    `)
    .eq('status', 'pending')
    .or(`reminder_sent_at.is.null,reminder_sent_at.lt.${cutoffTime.toISOString()}`)
    .eq('review_cycle.workspace_id', workspaceId);

  if (error) throw new Error(`Database error: ${error.message}`);
  return data || [];
}

/**
 * Send reminder to a participant
 */
async function sendReminder(participant, botToken) {
  try {
    await notificationService.sendReminder(
      botToken,
      participant,
      participant.review_cycle
    );

    // Update reminder_sent_at
    await supabase
      .from('participants')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', participant.id);

    return true;
  } catch (error) {
    console.error(`Error sending reminder to participant ${participant.id}:`, error);
    return false;
  }
}

/**
 * Check and send reminders for all pending reviews
 */
async function checkAndSendReminders() {
  console.log('Checking for pending reviews that need reminders...');

  // Get all workspaces
  const { data: workspaces, error: workspaceError } = await supabase
    .from('workspaces')
    .select('*');

  if (workspaceError) {
    console.error('Error fetching workspaces:', workspaceError);
    return;
  }

  for (const workspace of workspaces || []) {
    try {
      const pendingParticipants = await getPendingParticipantsNeedingReminders(workspace.id);

      console.log(`Found ${pendingParticipants.length} pending participants for workspace ${workspace.team_name}`);

      for (const participant of pendingParticipants) {
        await sendReminder(participant, workspace.bot_token);
      }
    } catch (error) {
      console.error(`Error processing reminders for workspace ${workspace.id}:`, error);
    }
  }
}

/**
 * Send daily reminder summary (optional - for managers/HR)
 */
async function sendDailyReminderSummary(workspaceId, botToken, managerUserId) {
  const pendingParticipants = await getPendingParticipantsNeedingReminders(workspaceId);

  if (pendingParticipants.length === 0) {
    return; // No pending reviews
  }

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*📊 Daily Review Reminder Summary*\n\nYou have *${pendingParticipants.length}* pending review${pendingParticipants.length > 1 ? 's' : ''} that need attention.`,
      },
    },
    {
      type: 'divider',
    },
  ];

  // Group by review cycle
  const byCycle = {};
  for (const participant of pendingParticipants) {
    const cycleId = participant.review_cycle_id;
    if (!byCycle[cycleId]) {
      byCycle[cycleId] = {
        cycle: participant.review_cycle,
        participants: [],
      };
    }
    byCycle[cycleId].participants.push(participant);
  }

  // Add summary for each cycle
  for (const [cycleId, data] of Object.entries(byCycle)) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${data.cycle.employee?.slack_name || 'Employee'}* - ${data.participants.length} pending reviewer${data.participants.length > 1 ? 's' : ''}`,
      },
    });
  }

  try {
    await notificationService.sendDM(botToken, managerUserId, 'Daily review reminder summary', blocks);
  } catch (error) {
    console.error('Error sending daily reminder summary:', error);
  }
}

module.exports = {
  getPendingParticipantsNeedingReminders,
  sendReminder,
  checkAndSendReminders,
  sendDailyReminderSummary,
};

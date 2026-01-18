const reviewService = require('../services/review-service');
const feedbackModel = require('../models/feedback');
const reviewCycleModel = require('../models/review-cycle');
const userModel = require('../models/user');

/**
 * Build Home Tab view with pending reviews and quick actions
 */
async function buildHomeTab(userId, workspaceId, slackUserId) {
  // userId here is the database user ID, slackUserId is the Slack user ID
  // If userId is actually a Slack ID, get the database user
  let dbUser = userId;
  if (typeof userId === 'string' && !userId.includes('-')) {
    // Looks like a Slack user ID, get database user
    dbUser = await userModel.getUserBySlackId(workspaceId, userId);
    if (!dbUser) {
      // User doesn't exist yet, create them
      dbUser = await userModel.getOrCreateUser(workspaceId, userId);
    }
    dbUser = dbUser.id;
  }
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🎯 Performance Review Dashboard',
        emoji: true,
      },
    },
    {
      type: 'divider',
    },
  ];

  // Get pending reviews
  const pendingReviews = await reviewService.getPendingReviewsForUser(dbUser, workspaceId);

  if (pendingReviews.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*📋 Pending Reviews (${pendingReviews.length})*\n\nYou have ${pendingReviews.length} review${pendingReviews.length > 1 ? 's' : ''} to complete:`,
      },
    });

    // List pending reviews
    for (const participant of pendingReviews.slice(0, 5)) { // Show max 5
      const cycle = participant.review_cycle;
      const employeeName = cycle.employee?.slack_name || 'Employee';
      const dueDate = cycle.due_date ? new Date(cycle.due_date).toLocaleDateString() : 'No due date';

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${employeeName}*\nRole: ${participant.role}\nDue: ${dueDate}`,
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Start Review',
            emoji: true,
          },
          style: 'primary',
          action_id: 'start_review',
          value: JSON.stringify({
            participantId: participant.id,
            cycleId: cycle.id,
          }),
        },
      });
    }

    if (pendingReviews.length > 5) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `+${pendingReviews.length - 5} more pending review${pendingReviews.length - 5 > 1 ? 's' : ''}`,
          },
        ],
      });
    }

    blocks.push({
      type: 'divider',
    });
  } else {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*✅ All Caught Up!*\n\nYou have no pending reviews at the moment.',
      },
    });
    blocks.push({
      type: 'divider',
    });
  }

  // Get active cycles (where user is employee or manager)
  const activeCycles = await reviewCycleModel.getCyclesForUser(dbUser, workspaceId, 'in_progress');

  if (activeCycles.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🔄 Active Review Cycles (${activeCycles.length})*`,
      },
    });

    for (const cycle of activeCycles.slice(0, 3)) {
      const employeeName = cycle.employee?.slack_name || 'Employee';
      const status = cycle.status === 'completed' ? '✅ Complete' : '⏳ In Progress';

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${employeeName}*\nStatus: ${status}`,
        },
      });
    }

    blocks.push({
      type: 'divider',
    });
  }

  // Quick actions
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*⚡ Quick Actions*',
    },
  });

  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Start New Review',
          emoji: true,
        },
        style: 'primary',
        action_id: 'quick_start_review',
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Give Feedback',
          emoji: true,
        },
        action_id: 'quick_give_feedback',
      },
    ],
  });

  blocks.push({
    type: 'divider',
  });

  // Help section
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*💡 Commands*\n• `/review @user` - Start a review cycle\n• `/feedback @user` - Give instant feedback',
    },
  });

  return {
    type: 'home',
    blocks,
  };
}

module.exports = {
  buildHomeTab,
};

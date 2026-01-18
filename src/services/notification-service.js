const { WebClient } = require('@slack/web-api');

/**
 * Send a DM to a user
 */
async function sendDM(botToken, userId, text, blocks = null) {
  const client = new WebClient(botToken);

  try {
    const result = await client.chat.postMessage({
      channel: userId,
      text,
      blocks,
    });

    return result;
  } catch (error) {
    console.error('Error sending DM:', error);
    throw error;
  }
}

/**
 * Notify a participant that they need to complete a review
 */
async function notifyReviewRequest(botToken, participant, reviewCycle, template) {
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🎯 Performance Review Request*\n\nYou've been asked to provide feedback for *${reviewCycle.employee?.slack_name || 'an employee'}*.`,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Review Type:*\n${participant.role === 'self' ? 'Self Review' : participant.role === 'manager' ? 'Manager Review' : 'Peer Review'}`,
        },
        {
          type: 'mrkdwn',
          text: `*Template:*\n${template?.name || 'Default Review'}`,
        },
      ],
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Click the button below to start providing your feedback:',
      },
    },
    {
      type: 'actions',
      elements: [
        {
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
            cycleId: reviewCycle.id,
          }),
        },
      ],
    },
  ];

  return sendDM(
    botToken,
    participant.reviewer.slack_user_id,
    `You've been asked to provide feedback for ${reviewCycle.employee?.slack_name || 'an employee'}. Click the button to start.`,
    blocks
  );
}

/**
 * Notify that a review cycle is complete
 */
async function notifyReviewComplete(botToken, reviewCycle) {
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*✅ Review Cycle Complete*\n\nThe performance review for *${reviewCycle.employee?.slack_name || 'the employee'}* has been completed.`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: reviewCycle.summary ? `*Summary:*\n${reviewCycle.summary}` : 'All feedback has been collected.',
      },
    },
  ];

  // Notify manager
  if (reviewCycle.manager?.slack_user_id) {
    await sendDM(
      botToken,
      reviewCycle.manager.slack_user_id,
      `Review cycle complete for ${reviewCycle.employee?.slack_name || 'the employee'}.`,
      blocks
    );
  }

  // Notify employee
  if (reviewCycle.employee?.slack_user_id) {
    await sendDM(
      botToken,
      reviewCycle.employee.slack_user_id,
      `Your performance review has been completed.`,
      blocks
    );
  }
}

/**
 * Send a reminder to complete a review
 */
async function sendReminder(botToken, participant, reviewCycle) {
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*⏰ Reminder: Review Pending*\n\nYou still need to complete your feedback for *${reviewCycle.employee?.slack_name || 'an employee'}*.`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Complete Review',
            emoji: true,
          },
          style: 'primary',
          action_id: 'start_review',
          value: JSON.stringify({
            participantId: participant.id,
            cycleId: reviewCycle.id,
          }),
        },
      ],
    },
  ];

  return sendDM(
    botToken,
    participant.reviewer.slack_user_id,
    `Reminder: Please complete your review for ${reviewCycle.employee?.slack_name || 'an employee'}.`,
    blocks
  );
}

module.exports = {
  sendDM,
  notifyReviewRequest,
  notifyReviewComplete,
  sendReminder,
};

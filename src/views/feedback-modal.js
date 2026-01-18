/**
 * Build a simple feedback modal for continuous feedback
 */
function buildFeedbackModal(targetUserId, targetUserName) {
  return {
    type: 'modal',
    callback_id: 'feedback_submission',
    private_metadata: JSON.stringify({
      toUserId: targetUserId,
    }),
    title: {
      type: 'plain_text',
      text: 'Give Feedback',
    },
    submit: {
      type: 'plain_text',
      text: 'Send Feedback',
    },
    close: {
      type: 'plain_text',
      text: 'Cancel',
    },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Providing feedback for *${targetUserName}*`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'input',
        block_id: 'feedback_type',
        element: {
          type: 'static_select',
          placeholder: {
            type: 'plain_text',
            text: 'Select feedback type',
          },
          options: [
            { text: { type: 'plain_text', text: '👍 Praise' }, value: 'praise' },
            { text: { type: 'plain_text', text: '💡 Suggestion' }, value: 'improvement' },
            { text: { type: 'plain_text', text: '❓ Question' }, value: 'question' },
            { text: { type: 'plain_text', text: '💬 General' }, value: 'general' },
          ],
          action_id: 'type_select',
        },
        label: {
          type: 'plain_text',
          text: 'Feedback Type',
        },
      },
      {
        type: 'input',
        block_id: 'feedback_message',
        element: {
          type: 'plain_text_input',
          multiline: true,
          placeholder: {
            type: 'plain_text',
            text: 'Share your feedback...',
          },
          action_id: 'message_input',
        },
        label: {
          type: 'plain_text',
          text: 'Your Feedback',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Would you like this feedback to be anonymous?',
        },
        accessory: {
          type: 'checkboxes',
          options: [
            {
              text: {
                type: 'plain_text',
                text: 'Send anonymously',
              },
              value: 'anonymous',
            },
          ],
          action_id: 'anonymous_check',
        },
      },
    ],
  };
}

module.exports = {
  buildFeedbackModal,
};

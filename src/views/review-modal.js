/**
 * Build a review form modal based on template questions
 */
function buildReviewModal(template, participant, reviewCycle) {
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `Performance Review: ${reviewCycle.employee?.slack_name || 'Employee'}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `You're providing feedback as a *${participant.role === 'self' ? 'Self Review' : participant.role === 'manager' ? 'Manager' : 'Peer'}*.`,
      },
    },
    {
      type: 'divider',
    },
  ];

  // Add questions from template
  const questions = template.questions || [];
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const questionId = `q_${i}_${question.id || i}`;

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${i + 1}. ${question.question}*${question.required ? ' *(Required)*' : ''}`,
      },
    });

    if (question.type === 'rating') {
      // Rating scale (1-5)
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Select a rating:',
        },
        accessory: {
          type: 'static_select',
          placeholder: {
            type: 'plain_text',
            text: 'Choose rating',
          },
          options: [
            { text: { type: 'plain_text', text: '1 - Needs Improvement' }, value: '1' },
            { text: { type: 'plain_text', text: '2 - Below Expectations' }, value: '2' },
            { text: { type: 'plain_text', text: '3 - Meets Expectations' }, value: '3' },
            { text: { type: 'plain_text', text: '4 - Exceeds Expectations' }, value: '4' },
            { text: { type: 'plain_text', text: '5 - Outstanding' }, value: '5' },
          ],
          action_id: `${questionId}_rating`,
        },
      });
    }

    // Text input for all questions (and required for text-type questions)
    blocks.push({
      type: 'input',
      block_id: questionId,
      element: {
        type: 'plain_text_input',
        multiline: true,
        placeholder: {
          type: 'plain_text',
          text: question.type === 'rating' ? 'Additional comments (optional)' : 'Your response',
        },
        action_id: 'text_input',
      },
      label: {
        type: 'plain_text',
        text: question.type === 'rating' ? 'Comments' : 'Response',
      },
    });
  }

  blocks.push({
    type: 'divider',
  });

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: 'All responses will be saved. You can edit your feedback later if needed.',
      },
    ],
  });

  return {
    type: 'modal',
    callback_id: 'review_submission',
    private_metadata: JSON.stringify({
      participantId: participant.id,
      cycleId: reviewCycle.id,
      templateId: template.id,
    }),
    title: {
      type: 'plain_text',
      text: 'Performance Review',
    },
    submit: {
      type: 'plain_text',
      text: 'Submit Review',
    },
    close: {
      type: 'plain_text',
      text: 'Cancel',
    },
    blocks,
  };
}

module.exports = {
  buildReviewModal,
};

const feedbackModel = require('../../models/feedback');
const reviewService = require('../../services/review-service');
const participantService = require('../../services/participant-service');
const templateService = require('../../services/template-service');
const aiService = require('../../services/ai-service');
const workspaceModel = require('../../models/workspace');
const reviewCycleModel = require('../../models/review-cycle');

/**
 * Handle modal submissions
 */
async function handleModalSubmission({ view, body, ack, respond, client }) {
  await ack();

  try {
    const callbackId = view.callback_id;
    const teamId = body.team.id;
    const userId = body.user.id;

    // Get workspace
    const workspace = await workspaceModel.getWorkspaceByTeamId(teamId);
    if (!workspace) {
      return await respond({
        text: '❌ Workspace not found',
        response_type: 'ephemeral',
      });
    }

    // Use workspace-specific token
    const workspaceClient = new (require('@slack/web-api').WebClient)(workspace.bot_token);

    if (callbackId === 'review_submission') {
      await handleReviewSubmission(view, workspace, workspaceClient, userId);
    } else if (callbackId === 'feedback_submission') {
      await handleFeedbackSubmission(view, workspace, workspaceClient, userId);
    }
  } catch (error) {
    console.error('Error handling modal submission:', error);
    await respond({
      text: `❌ Error: ${error.message}`,
      response_type: 'ephemeral',
    });
  }
}

/**
 * Handle review form submission
 */
async function handleReviewSubmission(view, workspace, client, userId) {
  const metadata = JSON.parse(view.private_metadata);
  const { participantId, cycleId, templateId } = metadata;

  // Get participant and cycle
  const participant = await participantService.getParticipantById(participantId);
  const cycle = await reviewCycleModel.getCycleById(cycleId);
  const template = await templateService.getTemplateById(templateId);

  // Extract responses from view state
  const questions = template.questions || [];
  const responses = [];

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const questionId = `q_${i}_${question.id || i}`;
    const block = view.state.values[questionId];

    if (!block) continue;

    const textInput = block.text_input?.value || '';
    const rating = block[`${questionId}_rating`]?.selected_option?.value || null;

    if (question.required && !textInput && !rating) {
      // Skip required validation for now - could add better error handling
      continue;
    }

    responses.push({
      questionId: question.id || questionId,
      questionText: question.question,
      response: textInput || (rating ? `Rating: ${rating}/5` : ''),
      rating: rating ? parseInt(rating) : null,
    });
  }

  // Save all feedback
  for (const response of responses) {
    await feedbackModel.saveFeedback(
      participantId,
      cycleId,
      response.questionId,
      response.questionText,
      response.response,
      response.rating
    );
  }

  // Mark participant as complete
  await participantService.updateParticipantStatus(participantId, 'completed');

  // Mark participant complete in review service (checks if cycle is done)
  await reviewService.markParticipantComplete(participantId, workspace.bot_token);

  // Check if cycle is complete and generate summary
  const allComplete = await reviewCycleModel.areAllParticipantsComplete(cycleId);
  if (allComplete) {
    // Generate AI summary
    const summary = await aiService.generateSummary(cycleId);
    if (summary) {
      await reviewCycleModel.updateCycleStatus(cycleId, 'completed', summary);
    }
  }

  // Confirm to user
  await client.chat.postMessage({
    channel: userId,
    text: '✅ Your review has been submitted! Thank you for your feedback.',
  });
}

/**
 * Handle feedback form submission
 */
async function handleFeedbackSubmission(view, workspace, client, userId) {
  const metadata = JSON.parse(view.private_metadata);
  const { toUserId } = metadata;

  // Get user models
  const fromUser = await require('../../models/user').getUserBySlackId(workspace.id, userId);
  const toUser = await require('../../models/user').getUserById(toUserId);

  // Extract form values
  const feedbackType = view.state.values.feedback_type?.type_select?.selected_option?.value || 'general';
  const message = view.state.values.feedback_message?.message_input?.value || '';
  const isAnonymous = view.state.values.anonymous_check?.anonymous_check?.selected_options?.some(
    opt => opt.value === 'anonymous'
  ) || false;

  if (!message.trim()) {
    await client.chat.postMessage({
      channel: userId,
      text: '❌ Feedback message cannot be empty.',
    });
    return;
  }

  // Save feedback
  await feedbackModel.saveContinuousFeedback(
    workspace.id,
    isAnonymous ? null : fromUser.id,
    toUser.id,
    message,
    feedbackType,
    isAnonymous
  );

  // Notify recipient
  const senderName = isAnonymous ? 'A colleague' : fromUser.slack_name || 'Someone';
  const emoji = feedbackType === 'praise' ? '👍' : feedbackType === 'improvement' ? '💡' : feedbackType === 'question' ? '❓' : '💬';

  try {
    await client.chat.postMessage({
      channel: toUser.slack_user_id,
      text: `${emoji} You received feedback from ${senderName}:\n\n${message}`,
    });
  } catch (error) {
    console.error('Error notifying feedback recipient:', error);
  }

  // Confirm to sender
  await client.chat.postMessage({
    channel: userId,
    text: `✅ Feedback sent to ${toUser.slack_name || 'user'}!`,
  });
}

module.exports = {
  handleModalSubmission,
};

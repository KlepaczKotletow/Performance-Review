const participantService = require('../../services/participant-service');
const reviewModal = require('../../views/review-modal');
const templateService = require('../../services/template-service');
const workspaceModel = require('../../models/workspace');

/**
 * Handle button clicks
 */
async function handleButtonClick({ action, body, ack, respond, client }) {
  await ack();

  try {
    const actionId = action.action_id;
    let value = {};
    try {
      value = action.value ? JSON.parse(action.value) : {};
    } catch (e) {
      // Value might not be JSON, use as-is
      value = action.value || {};
    }
    const teamId = body.team?.id || body.team_id;

    // Get workspace token
    const workspace = await workspaceModel.getWorkspaceByTeamId(teamId);
    if (!workspace) {
      return await respond({
        text: '❌ Workspace not found',
        response_type: 'ephemeral',
      });
    }

    // Use workspace-specific token
    const workspaceClient = new (require('@slack/web-api').WebClient)(workspace.bot_token);

    if (actionId === 'start_review') {
      // Open review modal
      const { participantId, cycleId } = value;

      const participant = await participantService.getParticipantById(participantId);
      if (!participant) {
        return await respond({
          text: '❌ Participant not found',
          response_type: 'ephemeral',
        });
      }

      const cycle = participant.review_cycle;
      const template = await templateService.getTemplateById(cycle.template_id);

      const modal = reviewModal.buildReviewModal(template, participant, cycle);

      try {
        await workspaceClient.views.open({
          trigger_id: body.trigger_id,
          view: modal,
        });
      } catch (error) {
        console.error('Error opening review modal:', error);
        await respond({
          text: `❌ Error opening review form: ${error.message}`,
          response_type: 'ephemeral',
        });
      }
    } else if (actionId === 'quick_start_review') {
      // Quick action - start new review
      await respond({
        text: 'Use `/review @employee` to start a new review cycle.',
        response_type: 'ephemeral',
      });
    } else if (actionId === 'quick_give_feedback') {
      // Quick action - give feedback
      await respond({
        text: 'Use `/feedback @user` to give feedback.',
        response_type: 'ephemeral',
      });
    }
  } catch (error) {
    console.error('Error handling button click:', error);
    await respond({
      text: `❌ Error: ${error.message}`,
      response_type: 'ephemeral',
    });
  }
}

module.exports = {
  handleButtonClick,
};

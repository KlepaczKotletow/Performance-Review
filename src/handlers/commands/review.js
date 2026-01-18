const { parseUserMentions } = require('../../utils/slack-helpers');
const userModel = require('../../models/user');
const workspaceModel = require('../../models/workspace');
const reviewService = require('../../services/review-service');
const templateService = require('../../services/template-service');

/**
 * Handle /review command
 * Usage: /review @employee [--peers=@peer1,@peer2] [--template=template-name] [--due=YYYY-MM-DD]
 */
async function handleReviewCommand({ command, ack, respond, client }) {
  await ack();

  try {
    const teamId = command.team_id;
    const userId = command.user_id;
    const text = command.text || '';

    // Get workspace
    const workspace = await workspaceModel.getWorkspaceByTeamId(teamId);
    if (!workspace) {
      return await respond({
        text: '❌ This workspace is not properly configured. Please reinstall the app.',
        response_type: 'ephemeral',
      });
    }

    // Get or create command user
    const commandUser = await userModel.getOrCreateUser(
      workspace.id,
      userId,
      null,
      null,
      'user' // Default role, can be updated later
    );

    // Parse command arguments
    const mentions = parseUserMentions(text);
    if (mentions.length === 0) {
      return await respond({
        text: '❌ Please mention the employee to review.\n\nUsage: `/review @employee [--peers=@peer1,@peer2] [--due=YYYY-MM-DD]`',
        response_type: 'ephemeral',
      });
    }

    const employeeSlackId = mentions[0];
    const employee = await userModel.getOrCreateUser(workspace.id, employeeSlackId);

    // Get manager (for now, assume command user is manager - can be improved)
    const managerId = commandUser.id;

    // Parse optional arguments
    const peerMentions = mentions.slice(1);
    const peerIds = [];
    for (const peerSlackId of peerMentions) {
      const peer = await userModel.getOrCreateUser(workspace.id, peerSlackId);
      peerIds.push(peer.id);
    }

    // Parse --due date if provided
    const dueMatch = text.match(/--due=(\S+)/);
    const dueDate = dueMatch ? new Date(dueMatch[1]) : null;

    // Get default template
    const template = await templateService.getDefaultTemplate(workspace.id);

    // Create review cycle
    const { cycle, participants } = await reviewService.createReviewCycle(
      workspace.id,
      employee.id,
      managerId,
      peerIds,
      template.id,
      dueDate,
      commandUser.id
    );

    // Send review requests to all participants
    await reviewService.sendReviewRequests(cycle, participants, workspace.bot_token);

    // Confirm to initiator
    const participantCount = participants.length;
    await respond({
      text: `✅ Review cycle created for ${employee.slack_name || 'employee'}!\n\n${participantCount} reviewer${participantCount > 1 ? 's' : ''} have been notified.`,
      response_type: 'ephemeral',
    });
  } catch (error) {
    console.error('Error handling /review command:', error);
    await respond({
      text: `❌ Error creating review cycle: ${error.message}`,
      response_type: 'ephemeral',
    });
  }
}

module.exports = {
  handleReviewCommand,
};

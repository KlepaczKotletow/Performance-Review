const { parseUserMentions } = require('../../utils/slack-helpers');
const userModel = require('../../models/user');
const workspaceModel = require('../../models/workspace');
const feedbackModel = require('../../models/feedback');
const feedbackModal = require('../../views/feedback-modal');

/**
 * Handle /feedback command
 * Usage: /feedback @user [message]
 */
async function handleFeedbackCommand({ command, ack, respond, client }) {
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

    // Get or create users
    const fromUser = await userModel.getOrCreateUser(workspace.id, userId);

    // Parse mentions
    const mentions = parseUserMentions(text);
    if (mentions.length === 0) {
      return await respond({
        text: '❌ Please mention the person you want to give feedback to.\n\nUsage: `/feedback @user [your message]`',
        response_type: 'ephemeral',
      });
    }

    const toUserSlackId = mentions[0];
    const toUser = await userModel.getOrCreateUser(workspace.id, toUserSlackId);

    // Get user info from Slack for display name
    let toUserName = toUser.slack_name || 'User';
    try {
      const userInfo = await client.users.info({ user: toUserSlackId });
      if (userInfo.user) {
        toUserName = userInfo.user.real_name || userInfo.user.name;
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }

    // Check if message was provided in command
    const messageMatch = text.match(/<@[^>]+>\s+(.+)/);
    const message = messageMatch ? messageMatch[1].trim() : null;

    if (message) {
      // Save feedback directly
      await feedbackModel.saveContinuousFeedback(
        workspace.id,
        fromUser.id,
        toUser.id,
        message,
        'general',
        false
      );

      // Notify recipient
      try {
        await client.chat.postMessage({
          channel: toUserSlackId,
          text: `You received feedback from ${fromUser.slack_name || 'a colleague'}:\n\n${message}`,
        });
      } catch (error) {
        console.error('Error notifying feedback recipient:', error);
      }

      await respond({
        text: `✅ Feedback sent to ${toUserName}!`,
        response_type: 'ephemeral',
      });
    } else {
      // Open modal for structured feedback
      const modal = feedbackModal.buildFeedbackModal(toUser.id, toUserName);
      
      try {
        await client.views.open({
          trigger_id: command.trigger_id,
          view: modal,
        });
      } catch (error) {
        console.error('Error opening feedback modal:', error);
        await respond({
          text: `❌ Error opening feedback form: ${error.message}`,
          response_type: 'ephemeral',
        });
      }
    }
  } catch (error) {
    console.error('Error handling /feedback command:', error);
    await respond({
      text: `❌ Error processing feedback: ${error.message}`,
      response_type: 'ephemeral',
    });
  }
}

module.exports = {
  handleFeedbackCommand,
};

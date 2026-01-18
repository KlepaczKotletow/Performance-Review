const homeTabView = require('../../views/home-tab');
const userModel = require('../../models/user');
const workspaceModel = require('../../models/workspace');

/**
 * Handle app_home_opened event
 */
async function handleAppHomeOpened({ event, client }) {
  try {
    const userId = event.user;
    const teamId = event.team;

    // Get workspace
    const workspace = await workspaceModel.getWorkspaceByTeamId(teamId);
    if (!workspace) {
      console.error(`Workspace not found for team ${teamId}`);
      return;
    }

    // Get or create user
    const user = await userModel.getOrCreateUser(workspace.id, userId);

    // Build home tab (pass database user ID)
    const view = await homeTabView.buildHomeTab(user.id, workspace.id, userId);

    // Use workspace-specific token
    const workspaceClient = new (require('@slack/web-api').WebClient)(workspace.bot_token);

    // Publish home tab
    await workspaceClient.views.publish({
      user_id: userId,
      view,
    });
  } catch (error) {
    console.error('Error handling app_home_opened:', error);
  }
}

module.exports = {
  handleAppHomeOpened,
};

const workspaceModel = require('../models/workspace');

/**
 * Middleware to get workspace token from team_id in Slack payload
 * This allows multi-workspace support by using workspace-specific tokens
 */
async function getWorkspaceToken(teamId) {
  try {
    const token = await workspaceModel.getWorkspaceToken(teamId);
    return token;
  } catch (error) {
    console.error(`Error getting workspace token for team ${teamId}:`, error);
    // Fallback to env token for development
    return process.env.SLACK_BOT_TOKEN;
  }
}

/**
 * Middleware function for Bolt that injects workspace token
 * This should be used in command/event handlers that need workspace-specific tokens
 */
function workspaceAuthMiddleware() {
  return async ({ context, next }) => {
    const teamId = context.teamId || context.team_id;
    if (teamId) {
      try {
        context.workspaceToken = await getWorkspaceToken(teamId);
      } catch (error) {
        console.error('Error in workspace auth middleware:', error);
        // Continue with default token
        context.workspaceToken = process.env.SLACK_BOT_TOKEN;
      }
    } else {
      context.workspaceToken = process.env.SLACK_BOT_TOKEN;
    }
    await next();
  };
}

module.exports = {
  getWorkspaceToken,
  workspaceAuthMiddleware,
};

const { supabase } = require('../database/connection');

/**
 * Get workspace by Slack team ID
 */
async function getWorkspaceByTeamId(teamId) {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('team_id', teamId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    throw new Error(`Database error: ${error.message}`);
  }

  return data;
}

/**
 * Get or create workspace
 */
async function getOrCreateWorkspace(teamId, teamName, botToken, botUserId) {
  // Try to get existing
  const existing = await getWorkspaceByTeamId(teamId);
  if (existing) {
    // Update if needed
    const { data, error } = await supabase
      .from('workspaces')
      .update({
        team_name: teamName,
        bot_token: botToken,
        bot_user_id: botUserId,
      })
      .eq('team_id', teamId)
      .select()
      .single();

    if (error) throw new Error(`Database error: ${error.message}`);
    return data;
  }

  // Create new
  const { data, error } = await supabase
    .from('workspaces')
    .insert({
      team_id: teamId,
      team_name: teamName,
      bot_token: botToken,
      bot_user_id: botUserId,
    })
    .select()
    .single();

  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
}

/**
 * Get bot token for a workspace
 */
async function getWorkspaceToken(teamId) {
  const workspace = await getWorkspaceByTeamId(teamId);
  if (!workspace) {
    throw new Error(`Workspace not found: ${teamId}`);
  }
  return workspace.bot_token;
}

module.exports = {
  getWorkspaceByTeamId,
  getOrCreateWorkspace,
  getWorkspaceToken,
};

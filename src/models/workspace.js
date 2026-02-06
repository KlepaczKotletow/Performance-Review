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
async function getOrCreateWorkspace(teamId, teamName, botToken, botUserId, refreshToken = null, tokenExpiresAt = null) {
  // Try to get existing
  const existing = await getWorkspaceByTeamId(teamId);
  if (existing) {
    // Update if needed
    const updateData = {
      team_name: teamName,
      bot_token: botToken,
      bot_user_id: botUserId,
      updated_at: new Date().toISOString(),
    };
    // Only overwrite refresh fields if provided (avoid nulling out existing values)
    if (refreshToken) updateData.refresh_token = refreshToken;
    if (tokenExpiresAt) updateData.token_expires_at = tokenExpiresAt;

    const { data, error } = await supabase
      .from('workspaces')
      .update(updateData)
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
      refresh_token: refreshToken,
      token_expires_at: tokenExpiresAt,
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

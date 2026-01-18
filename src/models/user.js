const { supabase } = require('../database/connection');

/**
 * Get or create user in database
 */
async function getOrCreateUser(workspaceId, slackUserId, slackEmail = null, slackName = null, role = 'user') {
  // Try to get existing user
  const { data: existing, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('slack_user_id', slackUserId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw new Error(`Database error: ${fetchError.message}`);
  }

  if (existing) {
    // Update if info changed
    const { data, error } = await supabase
      .from('users')
      .update({
        slack_email: slackEmail || existing.slack_email,
        slack_name: slackName || existing.slack_name,
        role: role || existing.role,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw new Error(`Database error: ${error.message}`);
    return data;
  }

  // Create new user
  const { data, error } = await supabase
    .from('users')
    .insert({
      workspace_id: workspaceId,
      slack_user_id: slackUserId,
      slack_email: slackEmail,
      slack_name: slackName,
      role: role,
    })
    .select()
    .single();

  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
}

/**
 * Get user by Slack user ID
 */
async function getUserBySlackId(workspaceId, slackUserId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('slack_user_id', slackUserId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Database error: ${error.message}`);
  }

  return data;
}

/**
 * Get user by database ID
 */
async function getUserById(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Database error: ${error.message}`);
  }

  return data;
}

/**
 * Update user role
 */
async function updateUserRole(userId, role) {
  const { data, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
}

module.exports = {
  getOrCreateUser,
  getUserBySlackId,
  getUserById,
  updateUserRole,
};

const { supabase } = require('../database/connection');

/**
 * Save feedback response
 */
async function saveFeedback(participantId, reviewCycleId, questionId, questionText, response, rating = null) {
  const { data, error } = await supabase
    .from('feedback')
    .insert({
      participant_id: participantId,
      review_cycle_id: reviewCycleId,
      question_id: questionId,
      question_text: questionText,
      response,
      rating,
    })
    .select()
    .single();

  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
}

/**
 * Get all feedback for a review cycle
 */
async function getFeedbackForCycle(reviewCycleId) {
  const { data, error } = await supabase
    .from('feedback')
    .select(`
      *,
      participant:participants(
        *,
        reviewer:users!participants_reviewer_id_fkey(*)
      )
    `)
    .eq('review_cycle_id', reviewCycleId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Database error: ${error.message}`);
  return data || [];
}

/**
 * Save continuous feedback
 */
async function saveContinuousFeedback(workspaceId, fromUserId, toUserId, message, feedbackType = 'general', isAnonymous = false, slackMessageTs = null, slackChannelId = null) {
  const { data, error } = await supabase
    .from('continuous_feedback')
    .insert({
      workspace_id: workspaceId,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      message,
      feedback_type: feedbackType,
      is_anonymous: isAnonymous,
      slack_message_ts: slackMessageTs,
      slack_channel_id: slackChannelId,
    })
    .select()
    .single();

  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
}

/**
 * Get continuous feedback for a user
 */
async function getContinuousFeedbackForUser(userId, workspaceId, limit = 20) {
  const { data, error } = await supabase
    .from('continuous_feedback')
    .select(`
      *,
      from_user:users!continuous_feedback_from_user_id_fkey(*)
    `)
    .eq('to_user_id', userId)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Database error: ${error.message}`);
  return data || [];
}

module.exports = {
  saveFeedback,
  getFeedbackForCycle,
  saveContinuousFeedback,
  getContinuousFeedbackForUser,
};

const { supabase } = require('../database/connection');

/**
 * Create a participant for a review cycle
 */
async function createParticipant(reviewCycleId, reviewerId, role) {
  const { data, error } = await supabase
    .from('participants')
    .insert({
      review_cycle_id: reviewCycleId,
      reviewer_id: reviewerId,
      role,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
}

/**
 * Get participant by ID
 */
async function getParticipantById(participantId) {
  const { data, error } = await supabase
    .from('participants')
    .select(`
      *,
      reviewer:users!participants_reviewer_id_fkey(*),
      review_cycle:review_cycles(
        *,
        employee:users!review_cycles_employee_id_fkey(*),
        manager:users!review_cycles_manager_id_fkey(*),
        template:templates(*)
      )
    `)
    .eq('id', participantId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Database error: ${error.message}`);
  }

  return data;
}

/**
 * Get participant by cycle and reviewer
 */
async function getParticipantByCycleAndReviewer(reviewCycleId, reviewerId) {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('review_cycle_id', reviewCycleId)
    .eq('reviewer_id', reviewerId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Database error: ${error.message}`);
  }

  return data;
}

/**
 * Update participant status
 */
async function updateParticipantStatus(participantId, status) {
  const updateData = { status };
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  } else if (status === 'in_progress') {
    // Don't update completed_at
  }

  const { data, error } = await supabase
    .from('participants')
    .update(updateData)
    .eq('id', participantId)
    .select()
    .single();

  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
}

module.exports = {
  createParticipant,
  getParticipantById,
  getParticipantByCycleAndReviewer,
  updateParticipantStatus,
};

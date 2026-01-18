const { supabase } = require('../database/connection');

/**
 * Create a new review cycle
 */
async function createCycle(workspaceId, employeeId, managerId, templateId, dueDate, createdBy) {
  const { data, error } = await supabase
    .from('review_cycles')
    .insert({
      workspace_id: workspaceId,
      employee_id: employeeId,
      manager_id: managerId,
      template_id: templateId,
      due_date: dueDate,
      created_by: createdBy,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
}

/**
 * Get review cycle by ID
 */
async function getCycleById(cycleId) {
  const { data, error } = await supabase
    .from('review_cycles')
    .select(`
      *,
      employee:users!review_cycles_employee_id_fkey(*),
      manager:users!review_cycles_manager_id_fkey(*),
      template:templates(*)
    `)
    .eq('id', cycleId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Database error: ${error.message}`);
  }

  return data;
}

/**
 * Get all review cycles for a user (as employee or manager)
 */
async function getCyclesForUser(userId, workspaceId, status = null) {
  let query = supabase
    .from('review_cycles')
    .select(`
      *,
      employee:users!review_cycles_employee_id_fkey(*),
      manager:users!review_cycles_manager_id_fkey(*),
      template:templates(*)
    `)
    .eq('workspace_id', workspaceId)
    .or(`employee_id.eq.${userId},manager_id.eq.${userId}`);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw new Error(`Database error: ${error.message}`);
  return data || [];
}

/**
 * Update review cycle status
 */
async function updateCycleStatus(cycleId, status, summary = null) {
  const updateData = { status };
  if (summary) {
    updateData.summary = summary;
  }
  if (status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('review_cycles')
    .update(updateData)
    .eq('id', cycleId)
    .select()
    .single();

  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
}

/**
 * Check if all participants have completed their feedback
 */
async function areAllParticipantsComplete(cycleId) {
  const { data, error } = await supabase
    .from('participants')
    .select('status')
    .eq('review_cycle_id', cycleId);

  if (error) throw new Error(`Database error: ${error.message}`);

  if (!data || data.length === 0) return false;
  return data.every(p => p.status === 'completed');
}

module.exports = {
  createCycle,
  getCycleById,
  getCyclesForUser,
  updateCycleStatus,
  areAllParticipantsComplete,
};

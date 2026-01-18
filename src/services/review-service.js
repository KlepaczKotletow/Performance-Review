const reviewCycleModel = require('../models/review-cycle');
const participantModel = require('./participant-service');
const templateService = require('./template-service');
const notificationService = require('./notification-service');
const { supabase } = require('../database/connection');

/**
 * Create a review cycle with participants
 */
async function createReviewCycle(workspaceId, employeeId, managerId, peerIds = [], templateId = null, dueDate = null, createdBy) {
  // Get template
  const template = templateId
    ? await templateService.getTemplateById(templateId)
    : await templateService.getDefaultTemplate(workspaceId);

  // Create review cycle
  const cycle = await reviewCycleModel.createCycle(
    workspaceId,
    employeeId,
    managerId,
    template.id,
    dueDate,
    createdBy
  );

  // Create participants
  const participants = [];

  // Self review
  participants.push(
    await participantModel.createParticipant(cycle.id, employeeId, 'self')
  );

  // Manager review
  if (managerId) {
    participants.push(
      await participantModel.createParticipant(cycle.id, managerId, 'manager')
    );
  }

  // Peer reviews
  for (const peerId of peerIds) {
    participants.push(
      await participantModel.createParticipant(cycle.id, peerId, 'peer')
    );
  }

  // Get full participant data with user info
  const participantsWithUsers = await Promise.all(
    participants.map(async (p) => {
      const { data } = await supabase
        .from('participants')
        .select(`
          *,
          reviewer:users!participants_reviewer_id_fkey(*)
        `)
        .eq('id', p.id)
        .single();
      return data;
    })
  );

  // Get cycle with relations
  const cycleWithRelations = await reviewCycleModel.getCycleById(cycle.id);

  return {
    cycle: cycleWithRelations,
    participants: participantsWithUsers,
  };
}

/**
 * Get pending reviews for a user
 */
async function getPendingReviewsForUser(userId, workspaceId) {
  // Get all participants where user is reviewer and status is pending
  const { data: participants, error } = await supabase
    .from('participants')
    .select(`
      *,
      review_cycle:review_cycles(
        *,
        employee:users!review_cycles_employee_id_fkey(*),
        template:templates(*)
      )
    `)
    .eq('reviewer_id', userId)
    .eq('status', 'pending');

  if (error) throw new Error(`Database error: ${error.message}`);

  return participants || [];
}

/**
 * Mark participant as complete and check if cycle is done
 */
async function markParticipantComplete(participantId, botToken) {
  // Update participant status
  const { data: participant, error } = await supabase
    .from('participants')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', participantId)
    .select()
    .single();

  if (error) throw new Error(`Database error: ${error.message}`);

  // Check if all participants are complete
  const allComplete = await reviewCycleModel.areAllParticipantsComplete(participant.review_cycle_id);

  if (allComplete) {
    // Update cycle status
    await reviewCycleModel.updateCycleStatus(participant.review_cycle_id, 'completed');

    // Get full cycle data
    const cycle = await reviewCycleModel.getCycleById(participant.review_cycle_id);

    // Notify completion (if AI service is available, generate summary first)
    // For now, just notify
    await notificationService.notifyReviewComplete(botToken, cycle);
  }

  return participant;
}

/**
 * Send initial review requests to all participants
 */
async function sendReviewRequests(cycle, participants, botToken) {
  const template = await templateService.getTemplateById(cycle.template_id);

  for (const participant of participants) {
    try {
      await notificationService.notifyReviewRequest(botToken, participant, cycle, template);
    } catch (error) {
      console.error(`Error sending review request to participant ${participant.id}:`, error);
    }
  }
}

module.exports = {
  createReviewCycle,
  getPendingReviewsForUser,
  markParticipantComplete,
  sendReviewRequests,
};

const { supabase } = require('../database/connection');

/**
 * Get default template for a workspace
 */
async function getDefaultTemplate(workspaceId) {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_default', true)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Database error: ${error.message}`);
  }

  // If no default, return a simple default template
  if (!data) {
    return {
      id: null,
      name: 'Default Review',
      questions: [
        {
          id: 'q1',
          type: 'rating',
          question: 'Overall Performance',
          required: true,
        },
        {
          id: 'q2',
          type: 'text',
          question: 'What are their key strengths?',
          required: true,
        },
        {
          id: 'q3',
          type: 'text',
          question: 'What areas need improvement?',
          required: true,
        },
        {
          id: 'q4',
          type: 'text',
          question: 'Additional comments',
          required: false,
        },
      ],
    };
  }

  return data;
}

/**
 * Get template by ID
 */
async function getTemplateById(templateId) {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Database error: ${error.message}`);
  }

  return data;
}

/**
 * Create a template
 */
async function createTemplate(workspaceId, name, description, questions, createdBy, isDefault = false) {
  // If this is default, unset other defaults
  if (isDefault) {
    await supabase
      .from('templates')
      .update({ is_default: false })
      .eq('workspace_id', workspaceId)
      .eq('is_default', true);
  }

  const { data, error } = await supabase
    .from('templates')
    .insert({
      workspace_id: workspaceId,
      name,
      description,
      questions,
      created_by: createdBy,
      is_default: isDefault,
    })
    .select()
    .single();

  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
}

/**
 * Get all templates for a workspace
 */
async function getTemplatesForWorkspace(workspaceId) {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Database error: ${error.message}`);
  return data || [];
}

module.exports = {
  getDefaultTemplate,
  getTemplateById,
  createTemplate,
  getTemplatesForWorkspace,
};

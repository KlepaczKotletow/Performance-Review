const OpenAI = require('openai');
const feedbackModel = require('../models/feedback');

/**
 * Initialize OpenAI client (optional - only if API key is provided)
 */
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

/**
 * Generate a summary of feedback for a review cycle
 */
async function generateSummary(reviewCycleId) {
  const client = getOpenAIClient();
  if (!client) {
    console.warn('OpenAI API key not configured. Skipping AI summary generation.');
    return null;
  }

  try {
    // Get all feedback for the cycle
    const feedback = await feedbackModel.getFeedbackForCycle(reviewCycleId);

    if (!feedback || feedback.length === 0) {
      return 'No feedback collected yet.';
    }

    // Organize feedback by question
    const feedbackByQuestion = {};
    for (const item of feedback) {
      const questionId = item.question_id;
      if (!feedbackByQuestion[questionId]) {
        feedbackByQuestion[questionId] = {
          question: item.question_text,
          responses: [],
        };
      }
      feedbackByQuestion[questionId].responses.push({
        response: item.response,
        rating: item.rating,
        reviewer: item.participant?.reviewer?.slack_name || 'Anonymous',
        role: item.participant?.role,
      });
    }

    // Build prompt
    let prompt = 'Analyze the following performance review feedback and provide a concise summary.\n\n';
    
    for (const [questionId, data] of Object.entries(feedbackByQuestion)) {
      prompt += `\nQuestion: ${data.question}\n`;
      for (const response of data.responses) {
        prompt += `- ${response.reviewer} (${response.role}): `;
        if (response.rating) {
          prompt += `Rating: ${response.rating}/5. `;
        }
        prompt += `${response.response}\n`;
      }
    }

    prompt += '\n\nProvide a summary that:\n';
    prompt += '1. Highlights key strengths mentioned\n';
    prompt += '2. Identifies areas for improvement\n';
    prompt += '3. Provides 2-3 actionable recommendations\n';
    prompt += '4. Is concise (3-4 paragraphs max)\n';

    // Call OpenAI
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini', // Using cheaper model for MVP
      messages: [
        {
          role: 'system',
          content: 'You are a helpful HR assistant that summarizes performance review feedback in a constructive and actionable way.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating AI summary:', error);
    // Return a basic summary if AI fails
    return 'Feedback has been collected. Review the detailed responses for insights.';
  }
}

/**
 * Detect potential bias in feedback text
 */
async function detectBias(feedbackText) {
  const client = getOpenAIClient();
  if (!client) {
    return null; // Skip bias detection if no API key
  }

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an HR assistant that detects potential bias in performance feedback. Respond with "BIAS_DETECTED" if you find biased language, or "NO_BIAS" if the feedback is fair and constructive.',
        },
        {
          role: 'user',
          content: `Analyze this feedback for potential bias:\n\n${feedbackText}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    const result = completion.choices[0].message.content.trim();
    return result === 'BIAS_DETECTED';
  } catch (error) {
    console.error('Error detecting bias:', error);
    return null;
  }
}

module.exports = {
  generateSummary,
  detectBias,
};

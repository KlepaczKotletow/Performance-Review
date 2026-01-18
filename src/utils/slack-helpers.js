/**
 * Parse user mentions from Slack text
 * Returns array of user IDs (without @ and <>)
 */
function parseUserMentions(text) {
  const mentionRegex = /<@([A-Z0-9]+)>/g;
  const mentions = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
}

/**
 * Extract user ID from Slack user mention format
 */
function extractUserId(mention) {
  // Remove <@ and >
  return mention.replace(/[<@>]/g, '');
}

/**
 * Format user mention for Slack
 */
function formatUserMention(userId) {
  return `<@${userId}>`;
}

/**
 * Parse date string (supports common formats)
 */
function parseDate(dateString) {
  if (!dateString) return null;

  // Try ISO format first
  let date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try common formats
  // YYYY-MM-DD
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    date = new Date(isoMatch[1], isoMatch[2] - 1, isoMatch[3]);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

/**
 * Format date for display
 */
function formatDate(date) {
  if (!date) return 'Not set';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Check if date is in the past
 */
function isPastDate(date) {
  if (!date) return false;
  return new Date(date) < new Date();
}

module.exports = {
  parseUserMentions,
  extractUserId,
  formatUserMention,
  parseDate,
  formatDate,
  isPastDate,
};

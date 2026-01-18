require('dotenv').config();

module.exports = {
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  botToken: process.env.SLACK_BOT_TOKEN,
  redirectUri: process.env.SLACK_REDIRECT_URI || `${process.env.BASE_URL}/slack/oauth_redirect`,
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
};

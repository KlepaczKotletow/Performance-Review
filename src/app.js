require('dotenv').config();
const { App, ExpressReceiver } = require('@slack/bolt');
const express = require('express');
const { supabase } = require('./database/connection');
const config = require('./config/slack');

// Initialize Express receiver for custom routes
const receiver = new ExpressReceiver({
  signingSecret: config.signingSecret,
  processBeforeResponse: true,
});

// Initialize Slack Bolt App
const app = new App({
  token: config.botToken,
  signingSecret: config.signingSecret,
  receiver: receiver,
  processBeforeResponse: true,
});

// Get Express app from receiver for custom routes
const expressApp = receiver.app;

// ===== CUSTOM ROUTES =====

// Health check endpoint
expressApp.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Slack Performance Review Bot',
    timestamp: new Date().toISOString(),
  });
});

// OAuth installation page
expressApp.get('/slack/install', (req, res) => {
  const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${config.clientId}&scope=chat:write,commands,users:read,app_mentions:read,channels:read&redirect_uri=${encodeURIComponent(config.redirectUri)}`;
  
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Add Performance Review Bot to Slack</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #f8f9fa;
          }
          .container {
            text-align: center;
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          h1 {
            color: #333;
            margin-bottom: 1rem;
          }
          p {
            color: #666;
            margin-bottom: 2rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎯 Performance Review Bot</h1>
          <p>Bring 360° reviews and continuous feedback into Slack</p>
          <a href="${authUrl}">
            <img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" />
          </a>
        </div>
      </body>
    </html>
  `);
});

// OAuth callback handler
expressApp.get('/slack/oauth_redirect', async (req, res) => {
  const code = req.query.code;
  const error = req.query.error;

  if (error) {
    return res.send(`Error: ${error}`);
  }

  if (!code) {
    return res.send('No authorization code provided.');
  }

  try {
    // Exchange code for token
    const result = await app.client.oauth.v2.access({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: code,
      redirect_uri: config.redirectUri,
    });

    if (result.ok) {
      // Store installation in database using workspace model
      const workspaceModel = require('./models/workspace');
      try {
        await workspaceModel.getOrCreateWorkspace(
          result.team.id,
          result.team.name,
          result.access_token,
          result.bot_user_id
        );
      } catch (dbError) {
        console.error('Database error storing workspace:', dbError);
      }

      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Installation Successful</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: #f8f9fa;
              }
              .container {
                text-align: center;
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✅ Successfully Installed!</h1>
              <p>Performance Review Bot has been added to <strong>${result.team.name}</strong></p>
              <p>You can now use /review and /feedback commands in Slack.</p>
            </div>
          </body>
        </html>
      `);
    } else {
      res.send(`Error: ${result.error}`);
    }
  } catch (error) {
    console.error('OAuth error:', error);
    res.send(`Error during installation: ${error.message}`);
  }
});

// ===== IMPORT HANDLERS =====
const reviewCommandHandler = require('./handlers/commands/review');
const feedbackCommandHandler = require('./handlers/commands/feedback');
const buttonHandler = require('./handlers/interactions/buttons');
const modalHandler = require('./handlers/interactions/modals');
const appHomeHandler = require('./handlers/events/app-home');
const reminderJob = require('./jobs/reminder-job');

// ===== SLACK COMMAND HANDLERS =====

// /review command
app.command('/review', reviewCommandHandler.handleReviewCommand);

// /feedback command
app.command('/feedback', feedbackCommandHandler.handleFeedbackCommand);

// ===== INTERACTION HANDLERS =====

// Button clicks
app.action(/.*/, buttonHandler.handleButtonClick);

// Modal submissions
app.view(/.*/, modalHandler.handleModalSubmission);

// ===== EVENT HANDLERS =====

// App Home opened
app.event('app_home_opened', appHomeHandler.handleAppHomeOpened);

// ===== START SERVER =====

(async () => {
  const port = config.port;
  
  try {
    await app.start(port);
    console.log(`⚡️  Slack Performance Review Bot is running!`);
    console.log(`📡 Server listening on port ${port}`);
    console.log(`🔗 Install URL: http://localhost:${port}/slack/install`);
    console.log(`🌍 Node environment: ${config.nodeEnv}`);
    
    if (!supabase) {
      console.warn('⚠️  Supabase not configured. Database features will be limited.');
    } else {
      console.log('✅ Supabase connected');
    }

    // Initialize scheduled jobs
    reminderJob.initializeReminderJob();
  } catch (error) {
    console.error('Failed to start app:', error);
    process.exit(1);
  }
})();

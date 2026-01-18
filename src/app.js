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

// Custom installation store for database
const installationStore = {
  async storeInstallation(installation, logger) {
    const workspaceModel = require('./models/workspace');
    try {
      await workspaceModel.getOrCreateWorkspace(
        installation.team.id,
        installation.team.name,
        installation.bot.token,
        installation.bot.id
      );
    } catch (error) {
      if (logger) logger.error('Error storing installation:', error);
      console.error('Error storing installation:', error);
      throw error;
    }
  },

  async fetchInstallation(installQuery, logger) {
    const workspaceModel = require('./models/workspace');
    const workspace = await workspaceModel.getWorkspaceByTeamId(installQuery.teamId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }
    return {
      team: {
        id: workspace.team_id,
        name: workspace.team_name,
      },
      bot: {
        id: workspace.bot_user_id,
        token: workspace.bot_token,
      },
    };
  },

  async deleteInstallation(installQuery, logger) {
    const workspaceModel = require('./models/workspace');
    const workspace = await workspaceModel.getWorkspaceByTeamId(installQuery.teamId);
    if (workspace) {
      const { supabase } = require('./database/connection');
      await supabase.from('workspaces').delete().eq('team_id', installQuery.teamId);
    }
  },
};

// Authorize function for multi-workspace support
async function authorize({ teamId, enterpriseId }) {
  const workspaceModel = require('./models/workspace');
  try {
    const workspace = await workspaceModel.getWorkspaceByTeamId(teamId);
    if (!workspace) {
      throw new Error(`No installation found for team ${teamId}`);
    }
    return {
      botToken: workspace.bot_token,
      botId: workspace.bot_user_id,
      botUserId: workspace.bot_user_id,
    };
  } catch (error) {
    console.error('Authorization error:', error);
    throw error;
  }
}

// Initialize Slack Bolt App
// Use OAuth installer pattern for multi-workspace support
const appConfig = {
  signingSecret: config.signingSecret,
  receiver: receiver,
  processBeforeResponse: true,
};

// Use OAuth installer if credentials are provided
if (config.clientId && config.clientSecret) {
  appConfig.clientId = config.clientId;
  appConfig.clientSecret = config.clientSecret;
  appConfig.stateSecret = config.signingSecret;
  appConfig.scopes = ['chat:write', 'commands', 'users:read', 'app_mentions:read', 'channels:read'];
  appConfig.authorize = authorize;
  appConfig.installationStore = installationStore;
} else if (config.botToken) {
  // Fallback to single workspace mode
  console.warn('⚠️  Using single-workspace token mode. OAuth credentials recommended for production.');
  appConfig.token = config.botToken;
} else {
  console.error('❌ No OAuth credentials or bot token provided. App cannot start.');
  console.error('Please set SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, and SLACK_SIGNING_SECRET in Railway environment variables.');
}

const app = new App(appConfig);

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

// OAuth installation page - Bolt installer will handle this automatically
// But we can add a custom route for a nicer landing page
expressApp.get('/slack/install', async (req, res) => {
  // If installer is available, redirect to it
  if (app.installer) {
    return app.installer.handleInstallPath(req, res, {
      scopes: ['chat:write', 'commands', 'users:read', 'app_mentions:read', 'channels:read'],
      userScopes: [],
      metadata: 'some_metadata',
    });
  }
  
  // Fallback to manual OAuth URL if installer not available
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

// OAuth callback handler - Bolt installer handles this automatically
expressApp.get('/slack/oauth_redirect', async (req, res) => {
  if (app.installer) {
    return app.installer.handleCallback(req, res);
  }
  
  // Fallback if installer not available
  res.send('OAuth callback - installer not configured');
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

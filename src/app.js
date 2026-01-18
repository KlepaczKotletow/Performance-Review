require('dotenv').config();
const { App, ExpressReceiver, InstallProvider } = require('@slack/bolt');
const express = require('express');
const { supabase } = require('./database/connection');
const config = require('./config/slack');

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
      console.log('Installation stored for team:', installation.team.name);
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

// Create InstallProvider for OAuth
const installer = new InstallProvider({
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  stateSecret: config.signingSecret,
  installationStore: installationStore,
});

// Initialize Express receiver
const receiver = new ExpressReceiver({
  signingSecret: config.signingSecret,
  processBeforeResponse: true,
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  stateSecret: config.signingSecret,
  scopes: ['chat:write', 'commands', 'users:read', 'app_mentions:read', 'channels:read', 'im:history', 'im:read', 'im:write', 'users:read.email'],
  installationStore: installationStore,
  installerOptions: {
    redirectUriPath: '/slack/oauth_redirect',
  },
});

// Initialize Slack Bolt App
const app = new App({
  receiver: receiver,
  authorize: authorize,
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
expressApp.get('/slack/install', async (req, res) => {
  try {
    const url = await receiver.installer.generateInstallUrl({
      scopes: ['chat:write', 'commands', 'users:read', 'app_mentions:read', 'channels:read', 'im:history', 'im:read', 'im:write', 'users:read.email'],
      redirectUri: config.redirectUri,
    });
    
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
            h1 { color: #333; margin-bottom: 1rem; }
            p { color: #666; margin-bottom: 2rem; }
            .btn {
              display: inline-block;
              background: #4A154B;
              color: white;
              padding: 12px 24px;
              border-radius: 4px;
              text-decoration: none;
              font-weight: bold;
            }
            .btn:hover { background: #611f69; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎯 Performance Review Bot</h1>
            <p>Bring 360° reviews and continuous feedback into Slack</p>
            <a href="${url}" class="btn">Add to Slack</a>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Install page error:', error);
    res.status(500).send('Error generating install URL');
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
    console.log(`🔗 Install URL: ${config.baseUrl}/slack/install`);
    console.log(`🌍 Node environment: ${config.nodeEnv}`);
    console.log(`✅ OAuth installer configured`);
    
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

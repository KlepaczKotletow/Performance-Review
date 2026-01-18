require('dotenv').config();
const { App, ExpressReceiver } = require('@slack/bolt');
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
      team: { id: workspace.team_id, name: workspace.team_name },
      bot: { id: workspace.bot_user_id, token: workspace.bot_token },
    };
  },

  async deleteInstallation(installQuery, logger) {
    const { supabase } = require('./database/connection');
    await supabase.from('workspaces').delete().eq('team_id', installQuery.teamId);
  },
};

// Authorize function
async function authorize({ teamId }) {
  const workspaceModel = require('./models/workspace');
  const workspace = await workspaceModel.getWorkspaceByTeamId(teamId);
  if (!workspace) {
    throw new Error(`No installation found for team ${teamId}`);
  }
  return {
    botToken: workspace.bot_token,
    botId: workspace.bot_user_id,
    botUserId: workspace.bot_user_id,
  };
}

// Initialize Express receiver with OAuth
const receiver = new ExpressReceiver({
  signingSecret: config.signingSecret,
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  stateSecret: config.signingSecret,
  scopes: ['chat:write', 'commands', 'users:read', 'app_mentions:read', 'channels:read', 'im:history', 'im:read', 'im:write', 'users:read.email'],
  installationStore: installationStore,
  installerOptions: {
    directInstall: true,
    redirectUriPath: '/slack/oauth_redirect',
  },
});

// Initialize Slack Bolt App
const app = new App({
  receiver: receiver,
  authorize: authorize,
});

const expressApp = receiver.app;

// Health check
expressApp.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Slack Performance Review Bot',
    timestamp: new Date().toISOString(),
  });
});

// ===== IMPORT HANDLERS =====
const reviewCommandHandler = require('./handlers/commands/review');
const feedbackCommandHandler = require('./handlers/commands/feedback');
const buttonHandler = require('./handlers/interactions/buttons');
const modalHandler = require('./handlers/interactions/modals');
const appHomeHandler = require('./handlers/events/app-home');
const reminderJob = require('./jobs/reminder-job');

// ===== SLACK COMMAND HANDLERS =====
app.command('/review', reviewCommandHandler.handleReviewCommand);
app.command('/feedback', feedbackCommandHandler.handleFeedbackCommand);

// ===== INTERACTION HANDLERS =====
app.action(/.*/, buttonHandler.handleButtonClick);
app.view(/.*/, modalHandler.handleModalSubmission);

// ===== EVENT HANDLERS =====
app.event('app_home_opened', appHomeHandler.handleAppHomeOpened);

// ===== START SERVER =====
(async () => {
  try {
    await app.start(config.port);
    console.log(`⚡️  Slack Performance Review Bot is running!`);
    console.log(`📡 Server listening on port ${config.port}`);
    console.log(`🔗 Install URL: ${config.baseUrl}/slack/install`);
    console.log(`✅ OAuth configured with ExpressReceiver`);
    
    if (supabase) {
      console.log('✅ Supabase connected');
    }

    reminderJob.initializeReminderJob();
  } catch (error) {
    console.error('Failed to start app:', error);
    process.exit(1);
  }
})();

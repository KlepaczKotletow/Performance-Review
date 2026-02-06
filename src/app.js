require('dotenv').config();
const { App, ExpressReceiver } = require('@slack/bolt');
const { supabase } = require('./database/connection');
const config = require('./config/slack');

// Custom installation store for database
const installationStore = {
  async storeInstallation(installation, logger) {
    const workspaceModel = require('./models/workspace');
    try {
      // Token rotation: Bolt provides refreshToken + expiresAt when enabled
      const refreshToken = installation.bot?.refreshToken || installation.refreshToken || null;
      const expiresAt = installation.bot?.expiresAt
        ? new Date(installation.bot.expiresAt * 1000).toISOString()
        : null;

      await workspaceModel.getOrCreateWorkspace(
        installation.team.id,
        installation.team.name,
        installation.bot.token,
        installation.bot.id,
        refreshToken,
        expiresAt
      );
      console.log('Installation stored for team:', installation.team.name,
        'has_refresh_token:', !!refreshToken, 'expires_at:', expiresAt);
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
      bot: {
        id: workspace.bot_user_id,
        token: workspace.bot_token,
        refreshToken: workspace.refresh_token || undefined,
        expiresAt: workspace.token_expires_at
          ? Math.floor(new Date(workspace.token_expires_at).getTime() / 1000)
          : undefined,
      },
    };
  },

  async deleteInstallation(installQuery, logger) {
    const { supabase } = require('./database/connection');
    await supabase.from('workspaces').delete().eq('team_id', installQuery.teamId);
  },
};

// Initialize Express receiver with OAuth
const receiver = new ExpressReceiver({
  signingSecret: config.signingSecret,
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  stateSecret: 'my-state-secret-' + config.signingSecret,
  scopes: ['chat:write', 'commands', 'users:read', 'app_mentions:read', 'channels:read', 'im:history', 'im:read', 'im:write', 'users:read.email'],
  installationStore: installationStore,
  installerOptions: {
    directInstall: true,
    stateVerification: false,  // Disable state verification for now
  },
});

// Initialize Slack Bolt App
const app = new App({
  receiver: receiver,
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
    console.log(`✅ OAuth configured`);
    
    if (supabase) {
      console.log('✅ Supabase connected');
    }

    reminderJob.initializeReminderJob();
  } catch (error) {
    console.error('Failed to start app:', error);
    process.exit(1);
  }
})();

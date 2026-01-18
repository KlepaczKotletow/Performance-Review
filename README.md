# Slack Performance Review Bot

A Slack-native performance review assistant that brings 360° reviews and continuous feedback into Slack. HR teams and managers can run review cycles, gather peer feedback, and share evaluations without leaving Slack.

## Features

- 🎯 **Review Cycles**: Create and manage performance review cycles
- 💬 **Continuous Feedback**: Give and receive feedback anytime
- 🤖 **AI Summaries**: Automated feedback summaries and insights
- 📊 **Dashboard**: Personalized Home Tab with pending tasks
- ⏰ **Reminders**: Automated reminders for pending reviews

## Tech Stack

- **Backend**: Node.js with Slack Bolt framework
- **Database**: Supabase PostgreSQL
- **Hosting**: Railway (recommended) or Render
- **AI**: OpenAI API (optional, for summaries)

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- Slack workspace (for testing)
- Supabase account
- Railway account (for deployment)

### 2. Environment Variables

Create a `.env` file in the root directory:

```bash
# Slack App Credentials (from api.slack.com)
SLACK_CLIENT_ID=your_client_id_here
SLACK_CLIENT_SECRET=your_client_secret_here
SLACK_SIGNING_SECRET=your_signing_secret_here
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_REDIRECT_URI=https://your-app.railway.app/slack/oauth_redirect

# Server Configuration
PORT=3000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# OpenAI (optional, for AI summaries)
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Database Setup

Run the migration SQL file in your Supabase SQL Editor:

```bash
# Copy contents of src/database/migrations/001_create_schema.sql
# Paste into Supabase SQL Editor and execute
```

Or use Supabase migrations if configured.

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Locally

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Your server will run at `http://localhost:3000`

### 6. Test Locally with ngrok

For Slack to reach your local server:

```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 3000

# Use the ngrok URL in Slack app configuration
# Example: https://abc123.ngrok.io/slack/events
```

### 7. Deploy to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Set environment variables in Railway dashboard
# Then deploy:
railway up

# Or connect GitHub repo for auto-deploy
```

After deployment, Railway will provide a URL like:
`https://your-app.railway.app`

Update your Slack app configuration with this URL.

## Slack App Configuration

### Required Scopes

- `chat:write` - Send messages/DMs
- `commands` - Slash commands
- `users:read` - Read user info
- `channels:read` - Read channel info
- `app_mentions:read` - Mention handling

### Required URLs

In your Slack app dashboard (api.slack.com):

- **OAuth Redirect URL**: `https://your-app.railway.app/slack/oauth_redirect`
- **Event Subscriptions URL**: `https://your-app.railway.app/slack/events`
- **Interactivity URL**: `https://your-app.railway.app/slack/actions`

### Slash Commands

- `/review @user` - Start a review cycle
- `/feedback @user` - Give instant feedback

## Project Structure

```
slack-performance-review/
├── src/
│   ├── app.js                    # Main Bolt app initialization
│   ├── config/
│   │   └── slack.js              # Slack configuration
│   ├── handlers/
│   │   ├── commands/             # Slash command handlers
│   │   ├── interactions/         # Button/modal handlers
│   │   ├── events/               # Event subscriptions
│   │   └── messages/             # Message action handlers
│   ├── services/
│   │   ├── review-service.js    # Business logic for reviews
│   │   ├── reminder-service.js  # Reminder scheduling
│   │   ├── ai-service.js        # AI summarization
│   │   └── notification-service.js
│   ├── models/                   # Database models
│   ├── database/
│   │   ├── migrations/           # DB schema migrations
│   │   └── connection.js         # Supabase connection
│   ├── views/                    # Slack Block Kit UI builders
│   └── middleware/               # Auth, validation
├── routes/                       # HTTP endpoints
├── jobs/                         # Scheduled tasks
├── .env                          # Environment variables (not committed)
└── package.json
```

## Development

```bash
# Run in development mode
npm run dev

# View logs
# Server will auto-reload on file changes
```

## License

MIT

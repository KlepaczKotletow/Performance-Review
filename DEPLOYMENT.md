# Deployment Guide

## Quick Start - Deploy to Railway

### Step 1: Prepare Your Code

Your code is ready! The project structure is set up with:
- ✅ Node.js + Slack Bolt framework
- ✅ Express server with custom routes
- ✅ Supabase database connection
- ✅ Database schema migration file

### Step 2: Set Up Supabase Database

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Open `src/database/migrations/001_create_schema.sql`
4. Copy all the SQL code
5. Paste into Supabase SQL Editor and click **Run**
6. Verify tables are created in **Table Editor**

This creates all necessary tables:
- `workspaces` - Slack workspace installations
- `users` - Slack user information
- `templates` - Review question templates
- `review_cycles` - Review cycle tracking
- `participants` - Review participants
- `feedback` - Feedback responses
- `continuous_feedback` - Ad-hoc feedback

### Step 3: Create Slack App

1. Go to https://api.slack.com/apps
2. Click **Create New App** → **From scratch**
3. Name it "Performance Review Bot" and select your workspace
4. Note these credentials (you'll need them):
   - **Client ID** (under OAuth & Permissions)
   - **Client Secret** (under OAuth & Permissions)
   - **Signing Secret** (under Basic Information)

### Step 4: Deploy to Railway

#### Option A: Using Railway CLI (Recommended)

```bash
# Install Railway CLI globally
npm i -g @railway/cli

# Login to Railway
railway login

# Initialize project (in your project directory)
railway init

# This will create a railway.json file
```

#### Option B: Using Railway Dashboard

1. Go to https://railway.app
2. Click **New Project**
3. Select **Deploy from GitHub** (if your code is on GitHub) OR **Empty Project**
4. If Empty Project:
   - Click **+ New** → **GitHub Repo** (if repo exists)
   - OR click **+ New** → **Empty Service** → Upload code

### Step 5: Configure Environment Variables

In Railway dashboard:

1. Go to your project → **Variables** tab
2. Add these environment variables:

```bash
# Slack App Credentials (from Step 3)
SLACK_CLIENT_ID=your_client_id_here
SLACK_CLIENT_SECRET=your_client_secret_here
SLACK_SIGNING_SECRET=your_signing_secret_here
SLACK_BOT_TOKEN=xoxb-temporary-will-update-after-oauth
SLACK_REDIRECT_URI=https://your-app.railway.app/slack/oauth_redirect

# Server
PORT=3000
NODE_ENV=production

# Supabase (from Supabase dashboard → Settings → API)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key

# Optional: OpenAI for AI summaries
OPENAI_API_KEY=your_openai_key
```

**Important**: Railway will give you a URL after first deployment. Update `SLACK_REDIRECT_URI` with that URL.

### Step 6: Deploy

```bash
# If using Railway CLI
railway up

# Or if using GitHub integration, just push to your repo
git push origin main
```

Railway will:
- Install dependencies (`npm install`)
- Run `npm start` (as defined in package.json)
- Provide a public URL like `https://your-app.railway.app`

### Step 7: Configure Slack App URLs

Now that your server is deployed, configure Slack:

1. Go back to https://api.slack.com/apps → Your app
2. **OAuth & Permissions**:
   - Add Redirect URL: `https://your-app.railway.app/slack/oauth_redirect`
   - Scroll down to **Scopes** → **Bot Token Scopes**, add:
     - `chat:write`
     - `commands`
     - `users:read`
     - `channels:read`
     - `app_mentions:read`
3. **Event Subscriptions**:
   - Enable Events
   - Request URL: `https://your-app.railway.app/slack/events`
   - Subscribe to bot events:
     - `app_home_opened`
4. **Interactivity & Shortcuts**:
   - Enable Interactivity
   - Request URL: `https://your-app.railway.app/slack/actions`
5. **Slash Commands** (optional - Bolt handles this automatically):
   - Create `/review` command
   - Create `/feedback` command

### Step 8: Install Your App

1. In Slack App settings, go to **Install App** → **Install to Workspace**
2. OR visit: `https://your-app.railway.app/slack/install`
3. Click **Add to Slack**
4. Authorize the app

After installation, the OAuth callback will store workspace tokens in your Supabase database.

### Step 9: Test Your App

In Slack:
- Type `/review` - Should see response
- Type `/feedback` - Should see response
- Click your app name in sidebar → **Home** tab should show dashboard

### Step 10: Update Bot Token in Railway (if needed)

After OAuth installation, the bot token is stored in Supabase. For initial setup, you may need to use the token from Slack during OAuth. The app will fetch tokens from database per workspace.

## Troubleshooting

### Server not starting
- Check Railway logs: Railway dashboard → Your service → **Deployments** → Click deployment → **View Logs**
- Verify all environment variables are set
- Check that `PORT` environment variable matches Railway's port

### Slack events not working
- Verify Request URLs in Slack app settings match your Railway URL
- Check that `SLACK_SIGNING_SECRET` is correct
- Verify Events are enabled in Slack app settings

### Database connection errors
- Verify Supabase credentials are correct
- Check Supabase project is active
- Ensure database tables are created (run migration SQL)

### OAuth not working
- Verify `SLACK_REDIRECT_URI` matches exactly in both:
  - Railway environment variables
  - Slack app OAuth & Permissions → Redirect URLs
- Check `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` are correct

## Next Steps

After basic setup is working:
1. ✅ Implement full `/review` command with modals
2. ✅ Implement full `/feedback` command
3. ✅ Add reminder scheduler
4. ✅ Implement AI summary generation
5. ✅ Build out Home Tab dashboard
6. ✅ Add message actions for feedback

## Resources

- Railway Docs: https://docs.railway.app
- Slack Bolt Docs: https://slack.dev/bolt-js
- Supabase Docs: https://supabase.com/docs

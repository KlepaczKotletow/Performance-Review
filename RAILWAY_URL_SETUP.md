# How to Get Your Railway URL

## Step 1: Expose Your Service

1. In Railway dashboard, click on your **"Performance-Review"** service
2. Click on the **"Settings"** tab (top right)
3. Scroll down to find **"Networking"** or **"Public Networking"** section
4. Look for:
   - **"Generate Domain"** button, OR
   - **"Public Networking"** toggle, OR
   - **"Expose"** option
5. Click to enable/generate

## Step 2: Get Your URL

After exposing, you'll see a URL like:
- `https://performance-review-production-xxxx.up.railway.app`
- OR `https://your-service-name.railway.app`

**Copy this URL!**

## Step 3: Update Environment Variables

1. Go to Railway → Your Service → **"Variables"** tab
2. Click **"Raw Editor"**
3. Update these two variables:
   - `BASE_URL=https://your-actual-railway-url.railway.app`
   - `SLACK_REDIRECT_URI=https://your-actual-railway-url.railway.app/slack/oauth_redirect`
4. Click **"Update Variables"**

## Step 4: Update Slack App URLs

Go to https://api.slack.com/apps → Your App and update:
- **OAuth Redirect URL**: `https://your-actual-railway-url.railway.app/slack/oauth_redirect`
- **Event Subscriptions URL**: `https://your-actual-railway-url.railway.app/slack/events`
- **Interactivity URL**: `https://your-actual-railway-url.railway.app/slack/actions`

## Troubleshooting

**Can't find "Generate Domain"?**
- Look in the **"Settings"** tab
- Check if there's a **"Networking"** section
- Some Railway plans require enabling public networking first

**Still no URL?**
- Make sure your service is deployed successfully
- Check if there are any errors in the deployment logs
- Railway may take a minute to generate the domain

# GitHub Setup Commands

After creating your GitHub repository, run these commands:

```bash
# Replace YOUR_USERNAME and YOUR_REPO_NAME with your actual values
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

**Example:**
If your GitHub username is `filipnowakowski` and repo name is `slack-performance-review-bot`:
```bash
git remote add origin https://github.com/filipnowakowski/slack-performance-review-bot.git
git branch -M main
git push -u origin main
```

**Note:** GitHub will ask you to authenticate. You can:
- Use a Personal Access Token (recommended)
- Or use GitHub CLI: `gh auth login`

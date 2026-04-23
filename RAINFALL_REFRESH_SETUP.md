# ⏰ Daily Rainfall Data Refresh Setup Guide

## What This Does

Your backend now automatically refreshes rainfall data from the IMD collector every day at **6:00 AM IST** using GitHub Actions. This solves the problem of stale rainfall predictions.

## Quick Setup (5 minutes)

### Step 1: Get Admin JWT Token

**Option A: From Frontend**
1. Login to your frontend as an admin user
2. Open browser DevTools (F12) → Console
3. Run: `localStorage.getItem('token')`
4. Copy the full token value

**Option B: Generate via Backend**
```python
# Run in backend environment
from app.core.security import create_access_token
admin_token = create_access_token(data={'sub': 'admin_email@example.com'})
print(admin_token)
```

### Step 2: Add GitHub Repository Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add two secrets:

   | Secret Name | Value |
   |---|---|
   | `RAINFALL_REFRESH_TOKEN` | Paste your admin JWT token here |
   | `BACKEND_API_URL` | `https://rockefeller-production.up.railway.app` |

### Step 3: Verify Workflow is Active

1. Go to your GitHub repo → **Actions** tab
2. You should see workflow: **"Refresh Rainfall Data Daily"**
3. If it shows, you're done! ✅

## Testing

### Manual Trigger (to test immediately)

1. Go to **Actions** tab → **"Refresh Rainfall Data Daily"**
2. Click **"Run workflow"** button
3. Wait 10 seconds, you'll see a run in progress
4. Check logs to see if it succeeded

### Or use curl:
```bash
curl -X POST \
  -H "Authorization: Bearer <your_admin_jwt>" \
  https://rockefeller-production.up.railway.app/api/rainfall/refresh
```

Expected response:
```json
{
  "status": "refresh_started",
  "message": "Rainfall data refresh initiated in background",
  "triggered_by": "your.admin@email.com"
}
```

## What Happens Every Day

📅 **Schedule**: 6:00 AM IST daily (cron: `30 0 * * *` UTC)

1. GitHub Actions wakes up
2. Calls your backend's `/api/rainfall/refresh` endpoint
3. Backend triggers IMD collector
4. IMD fetches latest rainfall from Open-Meteo API (free, no key needed)
5. Data is saved to MongoDB
6. Frontend dashboard shows updated predictions ✨

## Monitoring

### View Workflow Runs
- **GitHub**: Actions tab → "Refresh Rainfall Data Daily" → scroll down to see all runs
- **Check logs**: Click any run to see detailed curl output

### View Backend Logs
- **Railway Dashboard**: Logs tab for your backend service
- Look for lines starting with `[IMD Collector]`
- Should show: ✅ districts processed

## Troubleshooting

### Workflow doesn't run at 6 AM
- GitHub Actions cron uses **UTC time** (not IST)
- 6:00 AM IST = 0:30 AM UTC ✓ (already set correctly)
- Jobs may run within 15 minutes of scheduled time

### "Unauthorized" error in logs
- Your JWT token expired or is invalid
- Regenerate token and update `RAINFALL_REFRESH_TOKEN` secret
- Tokens typically expire after 24-30 days

### Workflow shows as failed
- Check **Railway backend health**: https://rockefeller-production.up.railway.app/api/health
- Check backend logs for errors
- Verify BACKEND_API_URL secret is correct (no trailing slash)

### Data not updating in frontend
- Hard refresh browser (Ctrl+Shift+R)
- Check MongoDB for new WeatherRecord entries
- Manual trigger to test: use curl command above

## Architecture

```
GitHub Actions (6 AM IST)
    ↓
POST /api/rainfall/refresh (+ JWT)
    ↓
FastAPI Backend (Railway)
    ↓
IMD Collector
    ↓
Open-Meteo API (free)
    ↓
MongoDB (36 district records)
    ↓
Frontend Dashboard (updated predictions)
```

## Files Created/Modified

- ✅ `.github/workflows/refresh-rainfall.yml` - Workflow definition
- ✅ `backend/app/api/routes/rainfall.py` - New `/refresh` endpoint
- ✅ `web.md` - Updated documentation

---

**Questions?** Check `web.md` section 11.5 for full details.

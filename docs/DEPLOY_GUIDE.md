# RudSonic — Complete Setup, Deployment & Maintenance Guide

## Table of Contents
1. [Get Your Free API Keys](#1-get-your-free-api-keys)
2. [Test APIs Locally First](#2-test-apis-locally-first)
3. [Deploy to Vercel](#3-deploy-to-vercel)
4. [Install the Premiere Pro Plugin](#4-install-the-premiere-pro-plugin)
5. [Test Everything End-to-End](#5-test-everything-end-to-end)
6. [Maintaining & Updating](#6-maintaining--updating)
7. [Monitoring](#7-monitoring)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Get Your Free API Keys

You need exactly **two free API keys**.

### Key 1 — Jamendo (Music Tab)
1. Go to → https://devportal.jamendo.com/
2. Create free account → click **"Create Application"** → Name it `RudSonic`
3. Copy the **Client ID** shown immediately

### Key 2 — API League (Sound Effects Tab)
1. Go to → https://apileague.com/console/
2. Create free account
3. Your API key is shown on the console dashboard
4. Free plan: 100 requests/day (upgradeable — generous for personal use)

---

## 2. Test APIs Locally First

### Setup local environment
```bash
cd C:\Users\basre\.gemini\antigravity\scratch\rudsonic

# Install dependencies
npm install

# Create your local env file
copy .env.example .env.local
```

Now edit `.env.local` — fill in both keys:
```
JAMENDO_CLIENT_ID=your_real_jamendo_id
API_LEAGUE_KEY=your_real_api_league_key
```

### Start local server
```bash
npm run dev
```
Server runs at: **http://localhost:3000**

### Verify all 3 endpoints in browser
Open each URL and check JSON is returned with correct durations:

```
http://localhost:3000/api/trending
→ music: tracks 10s–300s (max 5 min)
→ sfx: sounds 1s–30s (max 30 sec)

http://localhost:3000/api/music?q=cinematic
→ results array, each track duration ≤ 300s

http://localhost:3000/api/sfx?q=whoosh
→ results array, each sound duration ≤ 30s

http://localhost:3000/api/sfx?category=typing
→ typing/keyboard sounds, max 30s

http://localhost:3000/api/sfx?category=clock
→ clock ticking sounds, max 30s
```

> ✅ Duration enforcement is applied both in the API query AND as a hard client-side filter in the backend code, so no long files will ever reach the panel.

---

## 3. Deploy to Vercel

### Step 3A — Push to GitHub
```bash
git init
git add .
git commit -m "RudSonic v1 — API League SFX + Jamendo Music"

# Create a GitHub repo, then:
git remote add origin https://github.com/YOUR_USERNAME/rudsonic.git
git push -u origin main
```

### Step 3B — Import to Vercel
1. Go to https://vercel.com → Sign in with GitHub
2. Click **"Add New Project"** → Import your `rudsonic` repo
3. Framework auto-detected as **Next.js** → Click **Deploy**

### Step 3C — Add Environment Variables
In Vercel dashboard → **Settings → Environment Variables**:

| Name | Value | Environments |
|---|---|---|
| `JAMENDO_CLIENT_ID` | your Jamendo client ID | Production, Preview, Development |
| `API_LEAGUE_KEY` | your API League key | Production, Preview, Development |

Click **Save** after adding each.

### Step 3D — Redeploy
Go to **Deployments** → click ⋯ on latest → **Redeploy** → wait ~60s.

### Step 3E — Update the CEP panel URL
Edit `cep-panel/client/js/api.js` line 4:
```javascript
var BASE_URL = 'https://YOUR-PROJECT.vercel.app';
```

### Step 3F — Verify Vercel deployment
```
https://YOUR-PROJECT.vercel.app/api/trending   → should return JSON
https://YOUR-PROJECT.vercel.app/api/sfx?q=whoosh → should return sounds ≤ 30s
```

---

## 4. Install the Premiere Pro Plugin

### Step 4A — Enable CEP Developer Mode

**Windows (run once in PowerShell as Administrator):**
```powershell
REG ADD HKCU\Software\Adobe\CSXS.11 /v PlayerDebugMode /t REG_SZ /d 1 /f
# If you have Premiere Pro 2025 (v25.x), also run:
REG ADD HKCU\Software\Adobe\CSXS.12 /v PlayerDebugMode /t REG_SZ /d 1 /f
```

**macOS (Terminal):**
```bash
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
```

### Step 4B — Copy plugin files

**Windows:**
```
Source:      C:\Users\basre\.gemini\antigravity\scratch\rudsonic\cep-panel\
Destination: C:\Users\<YourUsername>\AppData\Roaming\Adobe\CEP\extensions\RudSonic\
```

The result should be:
```
CEP\extensions\RudSonic\
  ├── CSXS\manifest.xml
  ├── host\index.jsx
  └── client\
        ├── index.html
        ├── css\rudsonic.css
        └── js\  (api.js, app.js, music.js, sfx.js, player.js, favorites.js, CSInterface.js)
```

### Step 4C — Open in Premiere Pro
1. Completely **quit and relaunch** Premiere Pro
2. Menu → **Window → Extensions → RudSonic — Music & SFX**
3. Panel opens — dock it wherever you want!

---

## 5. Test Everything End-to-End

### Check Music tab
- [ ] Trending music loads (8 genre buckets × 6 tracks)
- [ ] All tracks show duration ≤ 5 minutes in the UI
- [ ] Search "cinematic" → results appear within 2s
- [ ] Genre chips (Lofi, Ambient, Funk, Jazz…) filter correctly
- [ ] Press ▶ → audio plays in bottom player bar
- [ ] Mood filter (Cinematic, Emotional…) works

### Check SFX tab
- [ ] Trending SFX loads — 8 category buckets
- [ ] All sounds show duration ≤ 30 seconds
- [ ] Click **⌨️ Typing** → typing/keyboard sounds appear ≤ 30s
- [ ] Click **🕐 Clock** → clock ticking sounds appear ≤ 30s
- [ ] Click **🚦 Traffic** → traffic/city sounds appear ≤ 30s
- [ ] Search "whoosh" → whoosh sounds appear
- [ ] Press play → sound plays immediately

### Check import
- [ ] Press **Import** button on any track → Premiere Pro shows the file in Project bin

---

## 6. Maintaining & Updating

### Update backend → auto-deploys on Vercel
```bash
git add . && git commit -m "update" && git push
# Vercel auto-deploys in ~30 seconds
```

### Update CEP panel (UI/JS changes)
1. Edit files in `cep-panel/client/`
2. Re-copy changed files to the extensions folder
3. Right-click panel in Premiere Pro → **Reload Extension** (no restart needed)

### Add new SFX category
1. `cep-panel/client/index.html` → add `<button class="rs-category-btn" data-category="newcat">...`
2. `app/api/sfx/route.ts` → add `newcat: 'search keywords'` in `CATEGORY_QUERIES`
3. Push to GitHub → auto-deploy

### Change trending buckets
Edit `app/api/trending/route.ts` → modify `TRENDING_MUSIC` or `TRENDING_SFX` arrays → push

---

## 7. Monitoring

| Dashboard | URL |
|---|---|
| Vercel (logs, deployments) | https://vercel.com/dashboard |
| API League (usage) | https://apileague.com/console/ |
| Jamendo Dev Portal | https://devportal.jamendo.com/ |

### Free tier limits
| Service | Free Limit |
|---|---|
| Jamendo | 35,000 requests/month |
| API League | 100 requests/day (upgrade if needed) |
| Vercel | 100GB bandwidth/month |

> If API League free limit is hit, upgrade to their Pro plan (~\$7/month). Or switch SFX back to Freesound if it becomes accessible.

---

## 8. Troubleshooting

### No SFX results appear
- Check `API_LEAGUE_KEY` is set in Vercel env vars
- Check daily request limit at apileague.com/console/
- Open browser DevTools in panel → Console tab for errors

### Music has wrong duration (too long / too short)
- Hard limit is enforced server-side: `durationbetween=10_300` on Jamendo
- AND a client-side filter removes anything > 300s
- If you see >5min tracks, file a bug report

### SFX has wrong duration (>30 seconds)
- Hard limit enforced: `?number=30&offset=0` + post-filter `duration <= 30`
- API League itself filters by query; our code discards anything > 30s

### Panel shows "Could not load"
- Verify `BASE_URL` in `api.js` matches your Vercel URL exactly (no trailing slash)
- Test the URL directly in a browser first

### Import doesn't work
- A Premiere Pro project must be open
- Right-click panel → Inspect → Console for ExtendScript errors

---

## Quick Reference

```
Local dev:       npm run dev → http://localhost:3000
Deploy:          git push → Vercel auto-deploys

API keys:
  Jamendo:       https://devportal.jamendo.com/
  API League:    https://apileague.com/console/

CEP extensions:  C:\Users\<you>\AppData\Roaming\Adobe\CEP\extensions\RudSonic\
Enable debug:    REG ADD HKCU\Software\Adobe\CSXS.11 /v PlayerDebugMode /t REG_SZ /d 1
Reload panel:    Right-click panel → Reload Extension

Duration limits (enforced server-side):
  Music:   max 5 minutes (300s), min 10s
  SFX:     max 30 seconds
```

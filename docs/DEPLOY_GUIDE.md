# RudSonic — Complete Setup, Deployment & Maintenance Guide

## Table of Contents
1. [Get Your Free API Key](#1-get-your-free-api-key)
2. [Deploy the Vercel Backend](#2-deploy-the-vercel-backend)
3. [Install the Premiere Pro Plugin](#3-install-the-premiere-pro-plugin)
4. [Test Everything](#4-test-everything)
5. [Maintaining & Updating](#5-maintaining--updating)
6. [Monitoring](#6-monitoring)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Get Your Free API Key

You only need **one API key** — Jamendo (for Music). Sound Effects come from **Internet Archive**, which is 100% free with no registration or API key!

### Jamendo API Client ID (for Music)
1. Go to → https://devportal.jamendo.com/
2. Create a free Jamendo developer account
3. Click **"Create Application"** → Name: `RudSonic`
4. Copy the **Client ID** shown on the app page

### Internet Archive (for Sound Effects)
✅ **No account or API key needed** — archive.org is completely open and free. Just use it!

---

## 2. Deploy the Vercel Backend

### Step 2A — Push code to GitHub
```bash
# Inside the rudsonic/ folder:
git init
git add .
git commit -m "Initial RudSonic commit"

# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/rudsonic.git
git push -u origin main
```

### Step 2B — Create Vercel project
1. Go to https://vercel.com → Sign in with GitHub
2. Click **"Add New Project"** → Import your `rudsonic` repository
3. Framework: **Next.js** (auto-detected)
4. Click **"Deploy"** (it will fail at first — we need to add the env var)

### Step 2C — Add Environment Variable
In your Vercel project dashboard:
1. Go to **Settings → Environment Variables**
2. Add this one variable:

| Name | Value |
|---|---|
| `JAMENDO_CLIENT_ID` | Your Jamendo Client ID |

3. Set Environments: **Production**, **Preview**, **Development** (check all three)
4. Click **Save**

### Step 2D — Redeploy
1. Go to **Deployments** tab → Click the three dots on the latest deployment
2. Click **Redeploy** → Wait ~60 seconds

### Step 2E — Test your API
Open these URLs in your browser and confirm they return JSON:
```
https://YOUR-PROJECT.vercel.app/api/trending
https://YOUR-PROJECT.vercel.app/api/music?q=cinematic
https://YOUR-PROJECT.vercel.app/api/sfx?q=whoosh
```

### Step 2F — Update the panel with your Vercel URL
Open this file: `cep-panel/client/js/api.js`

Find line:
```javascript
var BASE_URL = 'https://rudsonic.vercel.app';
```
Change it to your actual Vercel URL:
```javascript
var BASE_URL = 'https://YOUR-PROJECT.vercel.app';
```

---

## 3. Install the Premiere Pro Plugin

### Step 3A — Enable Developer Mode (Windows)
Run this **once** in PowerShell (as administrator):
```powershell
REG ADD HKCU\Software\Adobe\CSXS.11 /v PlayerDebugMode /t REG_SZ /d 1 /f
```
> This tells Premiere Pro to allow unsigned local CEP extensions.

For **macOS**, run in Terminal:
```bash
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
```

### Step 3B — Copy plugin to extensions folder

**Windows:**
```
Copy the entire cep-panel/ folder to:
C:\Users\<YourUsername>\AppData\Roaming\Adobe\CEP\extensions\RudSonic\
```
The final structure should look like:
```
C:\Users\YourName\AppData\Roaming\Adobe\CEP\extensions\RudSonic\
  ├── CSXS\manifest.xml
  ├── host\index.jsx
  └── client\
        ├── index.html
        ├── css\rudsonic.css
        └── js\ ...
```

**macOS:**
```
~/Library/Application Support/Adobe/CEP/extensions/RudSonic/
```

### Step 3C — Launch & Open the Panel
1. **Restart Premiere Pro** completely (quit and reopen)
2. In Premiere Pro menu: **Window → Extensions → RudSonic — Music & SFX**
3. The RudSonic panel opens in your workspace — dock it anywhere!

---

## 4. Test Everything

### In the panel, verify:
- [ ] Music tab loads trending tracks (takes 2–3 seconds)
- [ ] SFX tab loads trending sounds (takes 3–5 seconds — Archive.org fetches metadata in parallel)
- [ ] Click ▶ on any track → audio plays in the bottom player bar
- [ ] Search "cinematic" in Music → results appear
- [ ] Click 💨 Whooshes in SFX sidebar → whoosh sounds appear
- [ ] Click ❤️ on a track → appears in Favorites tab
- [ ] Click "Import" button → file downloaded and imported to Premiere Pro project bin

---

## 5. Maintaining & Updating

### Update the Vercel Backend
Any code change pushed to GitHub auto-deploys to Vercel in ~30 seconds:
```bash
git add .
git commit -m "feat: add new category filter"
git push
```

### Update the CEP Panel UI
1. Edit files in `cep-panel/client/`
2. Copy updated files to the extensions folder (overwrite)
3. In Premiere Pro: right-click the panel → **Reload Extension**

### Update Trending Sounds
Edit `app/api/trending/route.ts` — change the `TRENDING_MUSIC` and `TRENDING_SFX_QUERIES` arrays, then push to GitHub.

### Add New SFX Categories
In `cep-panel/client/index.html` → add a new `<button class="rs-category-btn">` in the sidebar.
In `app/api/sfx/route.ts` → add mapping in `CATEGORY_QUERIES`.

---

## 6. Monitoring

### Vercel Analytics (Free)
1. In Vercel dashboard → **Analytics** tab
2. Enable **Web Analytics** for free — shows request counts, latency, errors

### Check API Rate Limits
| Service | Free Limit | Notes |
|---|---|---|
| Jamendo | 35,000 requests/month | devportal.jamendo.com |
| Internet Archive | Unlimited (no key) | archive.org — completely open |
| Vercel | 100GB bandwidth/month | vercel.com/dashboard |

---

## 7. Troubleshooting

### Panel doesn't appear in Premiere Pro
- Confirm `PlayerDebugMode` registry key is set (Step 3A)
- Confirm the folder is at the exact path with exact name `RudSonic`
- Confirm `manifest.xml` exists at `RudSonic/CSXS/manifest.xml`
- Restart Premiere Pro completely

### "Could not load trending music" error
- Your Vercel URL in `api.js` `BASE_URL` may be wrong
- Check Vercel deployment logs for errors
- Verify `JAMENDO_CLIENT_ID` env variable is set in Vercel

### SFX results are slow
- Internet Archive metadata fetches are parallel but can take 3–5s on first load
- Results are cached for 5 min on Vercel edge — subsequent loads are instant
- This is normal — Archive.org is a public service without dedicated API infrastructure

### Audio preview won't play
- Some Archive.org files may be in formats the browser can't play (FLAC, WAV)
- The route prefers MP3 → OGG fallback
- Try a different SFX if one doesn't play

### Import button does nothing
- Must be running inside Premiere Pro (not a browser)
- A project must be open in Premiere Pro
- Check the browser console (right-click panel → Inspect → Console)

### "PlayerDebugMode" on Premiere Pro 2025
If using Premiere Pro 2025 (v25.x), also run:
```powershell
REG ADD HKCU\Software\Adobe\CSXS.12 /v PlayerDebugMode /t REG_SZ /d 1
```

---

## Quick Reference Card

```
Vercel Dashboard:    https://vercel.com/dashboard
Jamendo Dev Portal:  https://devportal.jamendo.com/
Internet Archive:    https://archive.org (no signup needed)
CEP Extensions dir:  C:\Users\<you>\AppData\Roaming\Adobe\CEP\extensions\

Enable debug (Win):  REG ADD HKCU\Software\Adobe\CSXS.11 /v PlayerDebugMode /t REG_SZ /d 1
Enable debug (Mac):  defaults write com.adobe.CSXS.11 PlayerDebugMode 1

Reload panel:        Right-click panel → Reload Extension
Update backend:      git push  (Vercel auto-deploys in ~30s)
```

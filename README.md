# RudSonic 🎵

> **Music & Sound Effects for Premiere Pro** — A free, dark-themed CEP plugin with 600,000+ royalty-free tracks and SFX, instant audio previews, favorites, and one-click import to your project.

![RudSonic Banner](https://img.shields.io/badge/Premiere%20Pro-Plugin-7c3aed?style=flat-square) ![License](https://img.shields.io/badge/License-MIT-green?style=flat-square) ![Free](https://img.shields.io/badge/Price-Free-brightgreen?style=flat-square)

---

## Features

| | |
|---|---|
| 🎵 **Music Page** | 600k+ Jamendo CC tracks — cinematic, lofi, ambient, electronic, hip-hop, jazz |
| 🔊 **SFX Page** | 600k+ Freesound CC sounds — whooshes, impacts, UI, foley, ambience, sci-fi |
| ▶ **Instant Preview** | Play any track in-panel before importing |
| ❤️ **Favorites** | Heart any track — saved locally, no login needed |
| ⬇️ **Import to Premiere** | One click → file lands in your Project bin |
| 🔍 **Smart Search** | Search + genre/mood/category filters |
| 🆓 **100% Free** | No subscription, no login, CC-licensed content |

---

## Project Structure

```
rudsonic/
├── app/                    ← Next.js backend (deploy to Vercel)
│   └── api/
│       ├── music/          ← Jamendo proxy
│       ├── sfx/            ← Freesound proxy
│       └── trending/       ← Curated trending lists
├── cep-panel/              ← Premiere Pro plugin (install locally)
│   ├── CSXS/manifest.xml
│   ├── host/index.jsx      ← ExtendScript (imports to timeline)
│   └── client/             ← HTML/CSS/JS panel UI
├── docs/
│   └── DEPLOY_GUIDE.md     ← Full setup guide
└── .env.example            ← API key template
```

---

## Quick Start

### 1. Get API Keys (free, 5 min)
- **Freesound**: https://freesound.org/apiv2/apply/
- **Jamendo**: https://devportal.jamendo.com/

### 2. Deploy Backend to Vercel
```bash
git clone https://github.com/YOUR/rudsonic
cd rudsonic
# Push to GitHub → import in vercel.com → add env vars → deploy
```
See [`docs/DEPLOY_GUIDE.md`](docs/DEPLOY_GUIDE.md) for step-by-step instructions.

### 3. Update Backend URL in Panel
Edit `cep-panel/client/js/api.js`:
```js
var BASE_URL = 'https://YOUR-PROJECT.vercel.app';
```

### 4. Install in Premiere Pro
```powershell
# Enable CEP debug mode (Windows, run once)
REG ADD HKCU\Software\Adobe\CSXS.11 /v PlayerDebugMode /t REG_SZ /d 1

# Copy plugin folder
Copy cep-panel\ → C:\Users\<you>\AppData\Roaming\Adobe\CEP\extensions\RudSonic\
```
Then: **Window → Extensions → RudSonic — Music & SFX** ✓

---

## Sound Sources

| Source | Content | License | Count | API Key? |
|---|---|---|---|---|
| [Jamendo](https://jamendo.com) | Music tracks | Creative Commons (CC-BY / CC0) | 600,000+ | ✅ Free key |
| [Internet Archive](https://archive.org) | SFX, foley, ambience, nature | CC / Public Domain | 500,000+ | ❌ No key needed |

> **Attribution note**: CC-BY sounds require crediting the artist in your video description. CC0 / Public Domain sounds need no attribution. License type is shown per track in the panel.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Next.js 14 (App Router, Edge Runtime) |
| Hosting | Vercel (free tier) |
| Music API | Jamendo v3 |
| SFX API | Freesound v2 |
| Panel | HTML5 + Vanilla JS (CEP 11) |
| Audio | HTML5 Audio API |
| Storage | localStorage (favorites) |
| Premiere | ExtendScript + CSInterface |

---

## License

MIT — free to use, modify, and distribute.

---

*Built for video editors by video editors. RudSonic is not affiliated with Adobe, Epidemic Sound, Freesound, or Jamendo.*

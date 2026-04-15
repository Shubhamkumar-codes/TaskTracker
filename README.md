# 🎯 Career Tracker — 6 Week Sprint to Remote DA Role

A Duolingo-style daily execution tracker built specifically for Shubham's 6-week sprint toward a remote Data Analyst / Junior Data Scientist role. Works on mobile + laptop, installable as PWA, with browser notifications.

---

## ✨ Features

- **4-Category Streak System** — Scaler · Skills · Portfolio · Job Hunt
- **16 default daily tasks** (editable per day, add/remove anytime)
- **Perfect Day tracking** with confetti + streak milestones
- **Full Scaler schedule** pre-loaded (Day 53 → Day 72, CV + NLP modules)
- **Auto backlog pacing** (shows which 2 backlog lectures to watch today)
- **Browser notifications** (PWA) — 4 configurable reminders/day
- **5-week calendar view** with fire/lightning/cloud emoji tracking
- **Export/Import JSON backups** (your data stays in your browser)
- **Mobile + laptop responsive** with bottom tab navigation
- **Offline-capable** via service worker

---

## 🚀 Quick Deploy to Vercel

### Option A: Via GitHub (Recommended)

1. **Create GitHub repo:**
   ```bash
   cd shubham-career-tracker
   git init
   git add .
   git commit -m "Initial tracker"
   git branch -M main
   git remote add origin https://github.com/Shubhamkumar-codes/career-tracker.git
   git push -u origin main
   ```

2. **Deploy on Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repo
   - Framework preset: **Next.js** (auto-detected)
   - Click **Deploy**
   - Done! You'll get a URL like `career-tracker-xyz.vercel.app`

### Option B: Via Vercel CLI

```bash
npm install -g vercel
cd shubham-career-tracker
vercel
# Follow prompts, accept defaults
```

---

## 💻 Run Locally

```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## 📱 Install as PWA

**On your phone (critical for notifications):**

- **Android Chrome:** Open your deployed URL → tap the ⋮ menu → "Add to Home screen" → "Install"
- **iOS Safari:** Open your URL → tap Share → "Add to Home Screen"
- **Desktop Chrome/Edge:** Click the install icon in the address bar (looks like a tiny screen with an arrow)

Once installed, the tracker lives as an app icon. Open it once a day, keep it alive in background for best notification reliability.

---

## 🔔 About Notifications (Honest Expectations)

Browser notifications have limits. Here's how to maximize reliability:

| Platform | Reliability | Notes |
|---|---|---|
| Desktop Chrome/Edge | ✅ Excellent | Works even with browser minimized |
| Android Chrome (PWA) | ✅ Very Good | Install to home screen |
| iOS Safari (PWA) | ⚠️ OK | Requires iOS 16.4+, PWA install mandatory |
| Browser fully closed on mobile | ❌ May not fire | Keep PWA in recents |

**Backup strategy:** The app also shows visual streak-at-risk warnings and a daily reset toast when you open it. Build a habit of opening it first thing in the morning and last thing at night.

---

## 📂 Project Structure

```
shubham-career-tracker/
├── app/
│   ├── layout.js           # Root layout + PWA meta tags
│   ├── page.js             # Main app (all 4 tabs, ~700 lines)
│   └── globals.css         # Dark theme + animations
├── lib/
│   ├── tasks.js            # Categories + default task templates
│   ├── scalerSchedule.js   # Full Scaler curriculum Day 53-72
│   ├── storage.js          # localStorage + export/import
│   └── notifications.js    # PWA notification scheduler
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service worker for notifications
│   ├── icon-192.png        # App icon
│   ├── icon-512.png        # App icon
│   └── favicon.ico
├── package.json
├── next.config.js
└── README.md
```

---

## 🎓 How the Streak System Works

- Each of the **4 categories** has **4 daily tasks** (16 total)
- Completing all 4 tasks in a category = **+1 streak for that category**
- Completing all 4 categories = **Perfect Day** 🔥 (confetti + perfect day counter)
- Missing a category resets its streak to 0
- Categories are independent — you can keep a Scaler streak alive even if Job Hunt resets
- Best streak per category is tracked separately so a reset doesn't erase your record

**Milestone toasts fire at:** Day 1, 3, 7, 14, 21, 30, 42

---

## ✏️ Editing Tasks

Tap the ✏️ icon on any task to rename it. Tap 🗑 to delete. Tap **+ Add task** to add new ones. Edits persist per-day and auto-save. Use the **Reset to defaults** button at the bottom of the Dashboard tab to revert to templates.

---

## 💾 Backup Your Data

Your data lives in browser `localStorage`. **Export a backup weekly** from Settings → Export Backup. You'll get a JSON file. Keep it in Google Drive. If you switch browsers or clear data, Import to restore.

---

## 🗓️ Your 6-Week Sprint Plan (Built Into the App)

### Week 1-2 (Foundation)
- Clear Scaler backlog to within 3 days of current
- Finalize 2 portfolio projects (1 ANZ simulation, 1 new)
- Rewrite LinkedIn with your overhaul guide
- Start 5 quality applications/day

### Week 3-4 (Acceleration)
- Deploy 1st project live (Vercel/Netlify/Streamlit)
- Master SQL window functions + advanced joins
- Begin mock interviews (SQL + case)
- Scale to 10 applications/day

### Week 5-6 (Land)
- Deploy 2nd project
- Intensive interview prep (2 mock per week)
- Recruiter outreach push
- Negotiate + close offer

---

## 🛠 Tech Stack

- **Next.js 14** (App Router)
- **React 18**
- **No external UI library** — everything is inline CSS-in-JS for zero bundle bloat
- **localStorage** for persistence
- **Service Worker** for PWA + notifications
- **Zero backend** — deploy anywhere, own your data

---

## 🎨 Replacing the Icons (Optional)

The included `icon-192.png` and `icon-512.png` are placeholder purple squares. Replace with your own icons (same filenames, same dimensions). Use [realfavicongenerator.net](https://realfavicongenerator.net) for a full icon set.

---

## 🤝 Mentorship Note

This tracker forces consistency — that's the whole point. But consistency without direction wastes time. Review the Stats tab weekly. If a category's streak is low and Perfect Days are rare, that category is where you're leaking time. Adjust the tasks to be more achievable, then ramp back up.

**Your non-negotiables:**
1. Watch live classes (MWF 9-11:30 PM) — no exceptions
2. Ship code to GitHub daily — even 5 lines counts
3. Apply to 5 quality roles daily — quality > quantity

**6 weeks = 42 days. You have them. Now execute.**

---

_Built on April 15, 2026. Edit freely — this is your tool._

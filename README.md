# 🛰️ SkyScope — Your Window to the Universe

**Project Zenith: The Celestial Eye** — AstralWeb Innovate, SRMIST Chennai (Aaruush '26)

A real-time cosmic radar. Pick any location on Earth and see exactly what's overhead right now — satellites, the ISS, planets, and constellations — rendered on an interactive 3D globe and a full night-sky chart, with live orbital mechanics.

🔗 **Live demo:** https://sky-scope-two.vercel.app
📂 **Repository:** https://github.com/Khubaib-programmer/SkyScope

---

## ✨ Features

| Feature | Description |
|---|---|
| 🌍 **Live Sky View** | Real-time satellite positions over any chosen location, on a 3D CesiumJS globe |
| 🛰️ **Real Orbital Mechanics** | Positions, speed, and orbit paths computed via **SGP4 propagation** (`satellite.js`) from live **CelesTrak** TLE data — not estimated |
| 🔭 **Orbit Path Visualization** | Click any tracked object to draw its predicted ground track for the next ~95 minutes |
| 🚀 **ISS Flyover Tracking** | Live ISS position + next visible pass time for your location |
| 🌌 **Night Sky View** | A dedicated constellation chart (lines + IAU names) with real-time planet positions, calculated independently via **astronomy-engine** (NASA/JPL-grade VSOP87 math, no API key needed) |
| 🌙 **NASA/JPL Horizons** | Precise Moon distance pulled directly from NASA's authoritative Horizons ephemeris service |
| 🌤️ **Viewing Conditions** | Cloud cover + visibility analysis to gauge stargazing conditions |
| 🌐 **Compare Mode** | Side-by-side sky comparison between two locations |
| 📱 **Fully Responsive** | CSS Grid/Flexbox layout adapts across desktop, tablet, and mobile |
| ☁️ **Live Deployed** | Hosted on Vercel as a serverless Express function — works the same in production as locally |

---

## 🧰 Tech Stack

**Frontend:** HTML5, CSS3 (Grid/Flexbox), Vanilla JavaScript, [CesiumJS](https://cesium.com/platform/cesiumjs/) (3D globe), [d3-celestial](https://github.com/ofrohn/d3-celestial) (constellation chart), [astronomy-engine](https://github.com/cosinekitty/astronomy) (planet positions), [satellite.js](https://github.com/shashwatak/satellite-js) (SGP4/SDP4 orbital propagator), [Lucide Icons](https://lucide.dev/) (SVG icons)

**Backend:** Node.js + Express — acts as a secure API proxy so no API keys are ever exposed to the browser, caches CelesTrak/Horizons data server-side, and runs as a Vercel serverless function in production.

**Live Data Sources:**

| Source | What it provides | Auth required? |
|---|---|---|
| **CelesTrak** | Orbital element sets (TLEs) for satellites & ISS | ❌ No key needed |
| **satellite.js (SGP4)** | Propagates TLEs into real-time lat/lng/altitude/speed and orbit paths | — (local computation) |
| **astronomy-engine** | Real-time Sun/Moon/planet positions for the Night Sky View | ❌ No key needed |
| **NASA/JPL Horizons** | Authoritative precise Moon distance ephemeris | ❌ No key needed |
| **Open-Notify** | Live ISS position | ❌ No key needed |
| **N2YO** | ISS visible-pass prediction times | ✅ Free key |
| **OpenWeatherMap** | Cloud cover & visibility for stargazing conditions | ✅ Free key |
| **d3-celestial** | Star catalog and constellation lines/names | ❌ No key needed |

---

## 📁 Project Structure

```
skyscope/
├── api/
│   └── index.js                 ← Vercel serverless function entry point (re-exports the Express app)
├── public/                      ← Frontend
│   ├── index.html               ← Main dashboard (globe + live tracking)
│   ├── nightsky.html            ← Constellation & planet chart view
│   ├── manifest.json            ← PWA manifest
│   ├── css/
│   │   ├── style.css            ← Core space theme + responsive layout
│   │   └── nightsky.css         ← Night Sky View styling
│   └── js/
│       ├── config.js            ← Frontend config (backend URL, defaults)
│       ├── starfield.js         ← Background star animation
│       ├── api.js               ← Calls our backend (satellites/ISS/weather/TLE/Horizons)
│       ├── orbital.js           ← SGP4 propagation logic (satellite.js wrapper)
│       ├── globe.js             ← CesiumJS globe rendering + orbit paths
│       ├── app.js               ← Main dashboard logic & data binding
│       └── nightsky.js          ← Constellation chart + astronomy-engine planet overlay
├── server/
│   ├── index.js                 ← Express server: API proxy, CelesTrak/Horizons cache
│   └── .env.example             ← Copy to .env and fill in your free keys
├── vercel.json                  ← Routes all requests through the Express serverless function
├── package.json
└── .gitignore
```

---

## 🚀 Setup Instructions

### 1. Prerequisites
Install [Node.js](https://nodejs.org) (LTS version). Verify:
```bash
node -v
npm -v
```

### 2. Clone & Install
```bash
git clone https://github.com/Khubaib-programmer/SkyScope.git
cd SkyScope
npm install
```

### 3. Configure API Keys
Copy the example env file:
```bash
cp server/.env.example server/.env
```

Get free keys (CelesTrak, astronomy-engine, NASA Horizons, and Open-Notify need **no key at all**):

| Key | Where to get it | Required? |
|---|---|---|
| `N2YO_API_KEY` | https://www.n2yo.com/api/ — free signup | Optional (ISS pass time falls back without it) |
| `OPENWEATHER_API_KEY` | https://openweathermap.org/api — free tier | Optional (uses demo weather data without it) |
| `ASTRONOMY_APP_ID` / `SECRET` | https://astronomyapi.com/ | Optional (moon phase calculated locally without it) |

Then set your free [Cesium Ion](https://cesium.com/ion/signup) token in `public/js/config.js`:
```js
CESIUM_ION_TOKEN: "your_token_here"
```

> The app runs even without any keys configured — CelesTrak, astronomy-engine, NASA Horizons, and Open-Notify all work with zero setup, and the optional APIs degrade gracefully to demo/calculated values.

### 4. Run Locally
```bash
npm start
```
Open **http://localhost:3000** in your browser.

### 5. Deploy to Vercel
This repo is already configured for Vercel (`vercel.json` + `api/index.js`). Just:
1. Push to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add the same environment variables from your `.env` in the Vercel project's **Settings → Environment Variables**
4. Deploy

---

## 🛰️ How the Real-Time Tracking Works

1. The backend fetches raw orbital element sets (TLEs) from **CelesTrak** and caches them for ~2 hours.
2. The frontend uses **satellite.js**, an SGP4/SDP4 propagator (the same algorithm class used by NORAD), to compute each satellite's real-time latitude, longitude, altitude, and orbital speed from those TLEs.
3. Satellites within visual range of the selected location are filtered using great-circle angular distance and plotted on the CesiumJS globe.
4. Clicking a satellite predicts and draws its orbit path for the next ~95 minutes — also computed via SGP4.
5. The **Night Sky View** renders constellations via `d3-celestial`, while planet positions are calculated independently via **astronomy-engine** and drawn as a custom SVG overlay — this two-system approach was needed because d3-celestial's own planets module proved unreliable across multiple CDN/version combinations during testing.
6. The Moon's precise distance is fetched directly from **NASA/JPL Horizons**, the same authoritative ephemeris service used by mission planners.

---

## 📱 Responsive Design

The layout uses CSS Grid for the 3-column dashboard (panels + globe) and switches to a single-column stacked layout under 1024px width, so it remains usable on tablets and phones.

---

## 🐛 Troubleshooting

**Globe doesn't render?**
→ Check that `CESIUM_ION_TOKEN` in `config.js` is a real token, not placeholder text.

**No satellites showing?**
→ The app fetches CelesTrak TLEs — if your network blocks `celestrak.org`, satellites won't load. Check the browser console (F12) and the Network tab for `/api/tle`.

**"Cannot GET /" error locally?**
→ Make sure you ran `npm start` and are visiting `http://localhost:3000`, not opening the HTML file directly.

**404 errors on Vercel?**
→ Make sure `vercel.json` uses the `rewrites` format pointing to `/api/index`, and that `api/index.js` exists and re-exports the Express app from `server/index.js`.

---

## 👥 Team

3 Members — AstralWeb Innovate, Project Zenith: The Celestial Eye
SRM Institute of Science and Technology (SRMIST), Chennai — Aaruush '26

---

## 📜 License & Attribution

- [CesiumJS](https://github.com/CesiumGS/cesium) — Apache 2.0
- [d3-celestial](https://github.com/ofrohn/d3-celestial) — BSD
- [astronomy-engine](https://github.com/cosinekitty/astronomy) — MIT
- [satellite.js](https://github.com/shashwatak/satellite-js) — MIT
- [Lucide Icons](https://github.com/lucide-icons/lucide) — ISC
- Orbital data: [CelesTrak](https://celestrak.org/) (T.S. Kelso)
- Ephemeris data: [NASA/JPL Horizons](https://ssd.jpl.nasa.gov/horizons/)

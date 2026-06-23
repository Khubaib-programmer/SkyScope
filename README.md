# 🛰️ SkyScope — Your Window to the Universe

**Project Zenith: The Celestial Eye** — AstralWeb Innovate, SRMIST Chennai (Aaruush '26)

A real-time cosmic radar. Pick any location on Earth and see exactly what's overhead right now — satellites, the ISS, planets, and constellations — rendered on an interactive 3D globe with live orbital mechanics.

🔗 **Live demo:** _add your hosted URL here after deployment_
📂 **Repository:** _add your GitHub repo URL here_

---

## ✨ Features

| Feature | Description |
|---|---|
| 🌍 **Live Sky View** | Real-time satellite positions over any chosen location, on a 3D CesiumJS globe |
| 🛰️ **Real Orbital Mechanics** | Positions, speed, and orbit paths computed via **SGP4 propagation** (`satellite.js`) from live **CelesTrak** TLE data — not estimated |
| 🔭 **Orbit Path Visualization** | Click any tracked object to draw its predicted ground track for the next ~95 minutes |
| 🚀 **ISS Flyover Tracking** | Live ISS position + next visible pass time for your location |
| 🌤️ **Viewing Conditions** | Cloud cover + visibility analysis to gauge stargazing conditions |
| 🌐 **Compare Mode** | Side-by-side sky comparison between two locations |
| 📱 **Fully Responsive** | CSS Grid/Flexbox layout adapts across desktop, tablet, and mobile |

---

## 🧰 Tech Stack

**Frontend:** HTML5, CSS3 (Grid/Flexbox), Vanilla JavaScript, [CesiumJS](https://cesium.com/platform/cesiumjs/) (3D globe), [satellite.js](https://github.com/shashwatak/satellite-js) (SGP4/SDP4 orbital propagator), [Lucide Icons](https://lucide.dev/) (SVG icons)

**Backend:** Node.js + Express — acts as a secure API proxy so no API keys are ever exposed to the browser, and caches CelesTrak orbital data server-side.

**Live Data Sources:**

| Source | What it provides | Auth required? |
|---|---|---|
| **CelesTrak** | Orbital element sets (TLEs) for satellites & ISS | ❌ No key needed |
| **satellite.js (SGP4)** | Propagates TLEs into real-time lat/lng/altitude/speed and orbit paths | — (local computation) |
| **Open-Notify** | Live ISS position | ❌ No key needed |
| **N2YO** | ISS visible-pass prediction times | ✅ Free key |
| **OpenWeatherMap** | Cloud cover & visibility for stargazing conditions | ✅ Free key |

---

## 📁 Project Structure

```
skyscope/
├── public/                      ← Frontend
│   ├── index.html               ← Main dashboard (globe + live tracking)
│   ├── manifest.json            ← PWA manifest
│   ├── css/
│   │   └── style.css            ← Core space theme + responsive layout
│   └── js/
│       ├── config.js            ← Frontend config (backend URL, defaults)
│       ├── starfield.js         ← Background star animation (with lifecycle)
│       ├── api.js               ← Calls our backend (satellites/ISS/weather/TLE)
│       ├── orbital.js           ← SGP4 propagation logic (satellite.js wrapper)
│       ├── globe.js             ← CesiumJS globe rendering + orbit paths
│       └── app.js               ← Main dashboard logic & data binding
├── server/
│   ├── index.js                 ← Express server: API proxy + CelesTrak cache
│   └── .env.example             ← Copy to .env and fill in your free keys
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
git clone <your-repo-url>
cd skyscope
npm install
```

### 3. Configure API Keys
Copy the example env file:
```bash
cp server/.env.example server/.env
```

Get free keys (CelesTrak and Open-Notify need **no key at all**):

| Key | Where to get it | Required? |
|---|---|---|
| `N2YO_API_KEY` | https://www.n2yo.com/api/ — free signup | Optional (ISS pass time falls back without it) |
| `OPENWEATHER_API_KEY` | https://openweathermap.org/api — free tier | Optional (uses demo weather data without it) |
| `ASTRONOMY_APP_ID` / `SECRET` | https://astronomyapi.com/ | Optional (moon phase calculated locally) |

Then set your free [Cesium Ion](https://cesium.com/ion/signup) token in `public/js/config.js`:
```js
CESIUM_ION_TOKEN: "your_token_here"
```

> The app runs even without any keys configured — CelesTrak and Open-Notify work with zero setup, and optional APIs degrade gracefully.

### 4. Run
```bash
npm start
```
Open **http://localhost:3000** in your browser.

---

## 🛰️ How the Real-Time Tracking Works

1. The backend fetches raw orbital element sets (TLEs) from **CelesTrak** and caches them for ~2 hours.
2. The frontend uses **satellite.js**, an SGP4/SDP4 propagator (the same algorithm class used by NORAD), to compute each satellite's real-time latitude, longitude, altitude, and orbital speed from those TLEs.
3. Satellites within visual range of the selected location are filtered using great-circle angular distance and plotted on the CesiumJS globe.
4. Clicking a satellite predicts and draws its orbit path for the next ~95 minutes — also computed via SGP4.

---

## 📱 Responsive Design

The layout uses CSS Grid for the 3-column dashboard (panels + globe) and switches to a single-column stacked layout under 1024px width, so it remains usable on tablets and phones.

---

## 🐛 Troubleshooting

**Globe doesn't render?**
→ Check that `CESIUM_ION_TOKEN` in `config.js` is a real token, not placeholder text.

**No satellites showing?**
→ The app fetches CelesTrak TLEs — if your network blocks `celestrak.org`, satellites won't load. Check the browser console (F12) and the Network tab for `/api/tle`.

**"Cannot GET /" error?**
→ Make sure you ran `npm start` and are visiting `http://localhost:3000`, not opening the HTML file directly.

---

## 👥 Team

3 Members — AstralWeb Innovate, Project Zenith: The Celestial Eye
SRM Institute of Science and Technology (SRMIST), Chennai — Aaruush '26

---

## 📜 License & Attribution

- [CesiumJS](https://github.com/CesiumGS/cesium) — Apache 2.0
- [satellite.js](https://github.com/shashwatak/satellite-js) — MIT
- [Lucide Icons](https://github.com/lucide-icons/lucide) — ISC
- Orbital data: [CelesTrak](https://celestrak.org/) (T.S. Kelso)

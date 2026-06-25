// ============================================
// SkyScope Backend — Node.js + Express
// Secure proxy: keeps API keys hidden from the browser.
// ============================================

require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const cors = require("cors");
const path = require("path");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// ---------- Environment Variables ----------
const N2YO_API_KEY = process.env.N2YO_API_KEY || "";
const ASTRONOMY_APP_ID = process.env.ASTRONOMY_APP_ID || "";
const ASTRONOMY_APP_SECRET = process.env.ASTRONOMY_APP_SECRET || "";
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || "";

// ---------- CelesTrak TLE Cache ----------
const tleCache = new Map();
const TLE_CACHE_TTL = 1000 * 60 * 60 * 2; // 2 hours

async function getCachedTLEs(group) {
  const now = Date.now();
  const cached = tleCache.get(group);
  if (cached && now - cached.fetchedAt < TLE_CACHE_TTL) {
    return cached.data;
  }

  const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`;
  const response = await fetch(url, { timeout: 10000 });
  const text = await response.text();

  const lines = text.split("\n").map((l) => l.trimEnd()).filter(Boolean);
  const satellites = [];
  for (let i = 0; i < lines.length - 2; i += 3) {
    const name = lines[i].trim();
    const tle1 = lines[i + 1];
    const tle2 = lines[i + 2];
    if (tle1 && tle1.startsWith("1 ") && tle2 && tle2.startsWith("2 ")) {
      satellites.push({ name, tle1, tle2 });
    }
  }

  tleCache.set(group, { data: satellites, fetchedAt: now });
  return satellites;
}

// ---------- Fallback Data ----------
function generateFallbackSatellites(lat, lng) {
  const names = [
    "STARLINK-5219", "COSMOS 2251 DEB", "ISS (ZARYA)", "NOAA 18",
    "GLOBALSTAR M069", "IRIDIUM 33 DEB", "STARLINK-3012", "GOES 16",
    "LANDSAT 9", "HUBBLE SPACE TELESCOPE", "TERRA", "AQUA",
    "SENTINEL-2A", "SWARM-A", "JASON-3"
  ];
  const count = 6 + Math.floor(Math.random() * 10);
  return Array.from({ length: count }, (_, i) => ({
    name: names[i % names.length],
    lat: parseFloat(lat) + (Math.random() - 0.5) * 30,
    lng: parseFloat(lng) + (Math.random() - 0.5) * 30,
    altitude: 200 + Math.round(Math.random() * 600),
    type: i < 2 ? "Communication" : i < 5 ? "Debris" : "Earth Observation",
    country: ["USA", "Russia", "ESA", "China", "India", "Japan"][Math.floor(Math.random() * 6)],
    speed: (6.5 + Math.random() * 2).toFixed(1),
    color: ["#7C4DFF", "#4FC3F7", "#00E5FF", "#FF6D00", "#00E676"][Math.floor(Math.random() * 5)],
  }));
}

// Simple moon phase calculator (Conway's algorithm)
function calculateMoonPhase() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  let r = year % 100;
  r %= 19;
  if (r > 9) r -= 19;
  r = ((r * 11) % 30) + month + day;
  if (month < 3) r += 2;
  r = Math.round(r - (year < 2000 ? 4 : 8.3));
  r = ((r % 30) + 30) % 30;

  const phases = [
    "New Moon", "Waxing Crescent", "Waxing Crescent", "Waxing Crescent",
    "Waxing Crescent", "Waxing Crescent", "Waxing Crescent", "First Quarter",
    "First Quarter", "Waxing Gibbous", "Waxing Gibbous", "Waxing Gibbous",
    "Waxing Gibbous", "Waxing Gibbous", "Full Moon", "Full Moon",
    "Waning Gibbous", "Waning Gibbous", "Waning Gibbous", "Waning Gibbous",
    "Waning Gibbous", "Last Quarter", "Last Quarter", "Waning Crescent",
    "Waning Crescent", "Waning Crescent", "Waning Crescent", "Waning Crescent",
    "Waning Crescent", "New Moon"
  ];
  return phases[r] || "Waxing Crescent";
}

// ============================================
// ROUTES
// ============================================

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    apis: {
      celestrak: true,
      n2yo: !!N2YO_API_KEY && !N2YO_API_KEY.includes("your_"),
      astronomy: !!ASTRONOMY_APP_ID && !ASTRONOMY_APP_ID.includes("your_"),
      weather: !!OPENWEATHER_API_KEY && !OPENWEATHER_API_KEY.includes("your_"),
    },
  });
});

// CelesTrak TLE data (cached)
app.get("/api/tle", async (req, res) => {
  const group = req.query.group || "stations";
  try {
    const satellites = await getCachedTLEs(group);
    const cached = tleCache.get(group);
    res.json({ satellites, source: "celestrak", cachedAt: cached.fetchedAt });
  } catch (err) {
    console.error("CelesTrak TLE error:", err.message);
    res.status(502).json({ satellites: [], error: "CelesTrak unavailable" });
  }
});

// Satellites currently overhead
app.get("/api/satellites", async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: "lat & lng required" });

  if (!N2YO_API_KEY || N2YO_API_KEY.includes("your_")) {
    return res.json({ satellites: generateFallbackSatellites(lat, lng), demo: true });
  }

  try {
    const url = `https://api.n2yo.com/rest/v1/satellite/above/${lat}/${lng}/0/70/0/?apiKey=${N2YO_API_KEY}`;
    const response = await fetch(url, { timeout: 8000 });
    const data = await response.json();

    const satellites = (data.above || []).slice(0, 20).map((sat) => ({
      name: sat.satname,
      lat: sat.satlat,
      lng: sat.satlng,
      altitude: Math.round(sat.satalt),
      type: "Satellite",
      country: "Unknown",
      speed: (6.5 + Math.random() * 2).toFixed(1),
      color: "#7C4DFF",
    }));

    if (satellites.length === 0) {
      return res.json({ satellites: generateFallbackSatellites(lat, lng), demo: true });
    }

    res.json({ satellites });
  } catch (err) {
    console.error("Satellite API error:", err.message);
    res.json({ satellites: generateFallbackSatellites(lat, lng), demo: true });
  }
});

// ISS position + next pass
app.get("/api/iss", async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: "lat & lng required" });

  try {
    const posRes = await fetch("http://api.open-notify.org/iss-now.json", { timeout: 5000 });
    const posData = await posRes.json();

    let nextPass = "Calculating...";

    if (N2YO_API_KEY && !N2YO_API_KEY.includes("your_")) {
      try {
        const passUrl = `https://api.n2yo.com/rest/v1/satellite/visualpasses/25544/${lat}/${lng}/0/1/300/?apiKey=${N2YO_API_KEY}`;
        const passRes = await fetch(passUrl, { timeout: 8000 });
        const passData = await passRes.json();

        if (passData.passes && passData.passes.length > 0) {
          const startUTC = passData.passes[0].startUTC * 1000;
          nextPass = new Date(startUTC).toLocaleString();
        } else {
          nextPass = "No upcoming visible pass";
        }
      } catch (e) {
        nextPass = "No upcoming visible pass";
      }
    }

    res.json({ position: posData.iss_position || null, nextPass });
  } catch (err) {
    console.error("ISS API error:", err.message);
    res.json({
      nextPass: "Data temporarily unavailable",
      position: { latitude: "51.5074", longitude: "-0.1278" },
    });
  }
});

// Astronomy data (moon phase)
app.get("/api/astronomy", async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: "lat & lng required" });

  if (!ASTRONOMY_APP_ID || ASTRONOMY_APP_ID.includes("your_")) {
    return res.json({ moonPhase: calculateMoonPhase() });
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const authHeader =
      "Basic " + Buffer.from(`${ASTRONOMY_APP_ID}:${ASTRONOMY_APP_SECRET}`).toString("base64");

    const url = `https://api.astronomyapi.com/api/v2/studio/moon-phase`;
    const body = {
      format: "png",
      style: {
        moonStyle: "default",
        backgroundStyle: "stars",
        backgroundColor: "#000000",
        headingColor: "#ffffff",
        textColor: "#ffffff",
      },
      observer: { latitude: parseFloat(lat), longitude: parseFloat(lng), date: today },
      view: { type: "portrait-simple" },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      timeout: 8000,
    });
    const data = await response.json();
    res.json({ moonPhase: data?.data?.imageUrl ? "Available" : calculateMoonPhase() });
  } catch (err) {
    console.error("Astronomy API error:", err.message);
    res.json({ moonPhase: calculateMoonPhase() });
  }
});

// Weather / cloud cover
app.get("/api/weather", async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: "lat & lng required" });

  if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY.includes("your_")) {
    return res.json({
      cloudCover: `${20 + Math.round(Math.random() * 40)}%`,
      visibility: `${(5 + Math.random() * 10).toFixed(1)} km`,
      demo: true,
    });
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const response = await fetch(url, { timeout: 8000 });
    const data = await response.json();

    res.json({
      cloudCover: data?.clouds?.all !== undefined ? `${data.clouds.all}%` : "N/A",
      visibility: data?.visibility !== undefined ? `${(data.visibility / 1000).toFixed(1)} km` : "N/A",
    });
  } catch (err) {
    console.error("Weather API error:", err.message);
    res.json({ cloudCover: "N/A", visibility: "N/A" });
  }
});

// Fallback: serve frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🚀 SkyScope server running at http://localhost:${PORT}`);
  console.log(`\n   API Key Status:`);
  console.log(`   • CelesTrak:    ✅ Always available (no key required)`);
  console.log(`   • N2YO:        ${N2YO_API_KEY && !N2YO_API_KEY.includes("your_") ? "✅ Configured" : "⚠️  Using demo data"}`);
  console.log(`   • AstronomyAPI: ${ASTRONOMY_APP_ID && !ASTRONOMY_APP_ID.includes("your_") ? "✅ Configured" : "⚠️  Using calculated phase"}`);
  console.log(`   • OpenWeather:  ${OPENWEATHER_API_KEY && !OPENWEATHER_API_KEY.includes("your_") ? "✅ Configured" : "⚠️  Using demo data"}`);
  console.log(`\n   Open http://localhost:${PORT} in your browser.\n`);
});

// Export for Vercel serverless deployment
module.exports = app;

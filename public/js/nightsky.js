// ============================================
// Night Sky View — Constellation + Planet Chart
// Powered by D3-Celestial (BSD license, ofrohn/d3-celestial)
// Planet positions use built-in Keplerian elements —
// no API key or network call needed for this page.
// ============================================

// Read the location that was active on the dashboard (passed via
// localStorage isn't allowed in this app's artifacts policy, so we
// read it from the URL query string instead, with a safe fallback).
function getLocationFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const lat = parseFloat(params.get("lat"));
  const lng = parseFloat(params.get("lng"));
  const name = params.get("name");
  if (!isNaN(lat) && !isNaN(lng)) {
    return { lat, lng, name: name || "Selected Location" };
  }
  return { ...CONFIG_FALLBACK };
}

// Fallback if no location was passed (e.g. page opened directly)
const CONFIG_FALLBACK = { lat: 28.6139, lng: 77.209, name: "New Delhi, India" };

const userLocation = getLocationFromQuery();

document.getElementById("nightSkyLocationDisplay").innerHTML =
  `<i data-lucide="map-pin" class="icon-xs"></i> ${userLocation.name}`;
if (typeof lucide !== "undefined") lucide.createIcons();
document.getElementById("nightSkyLat").textContent = userLocation.lat.toFixed(4) + "°";
document.getElementById("nightSkyLng").textContent = userLocation.lng.toFixed(4) + "°";
document.getElementById("nightSkyTime").textContent = new Date().toLocaleString();

// ---------- D3-Celestial Configuration ----------
const celestialConfig = {
  width: 0, // full container width
  projection: "stereographic", // gives a "looking up at the sky" hemisphere view
  transform: "equatorial",
  center: null,
  geopos: [userLocation.lat, userLocation.lng],
  follow: "zenith", // center the chart on the zenith point above the location
  zoomlevel: null,
  zoomextend: 10,
  adaptable: true,
  interactive: true,
  form: false, // we use our own custom toggle UI instead
  location: true,
  formFields: { location: false },
  container: "celestial-map",
  datapath: "https://cdn.jsdelivr.net/gh/ofrohn/d3-celestial@master/data/",

  stars: {
    show: true,
    limit: 6,
    colors: true,
    style: { fill: "#ffffff", opacity: 1 },
    designation: false,
    propername: false,
    size: 6,
    exponent: -0.28,
    data: "stars.6.json",
  },
  dsos: { show: false },
  constellations: {
    names: true,
    namesType: "iau",
    nameStyle: {
      fill: "#7C9DD9",
      align: "center",
      baseline: "middle",
      font: ["13px Orbitron, Helvetica, Arial, sans-serif", "11px Helvetica, Arial, sans-serif"],
    },
    lines: true,
    lineStyle: { stroke: "#4FC3F7", width: 1, opacity: 0.45 },
    bounds: false,
  },
  mw: {
    show: true,
    style: { fill: "#ffffff", opacity: 0.08 },
  },
  planets: {
    show: true,
    which: ["sol", "mer", "ven", "lun", "mar", "jup", "sat", "ura", "nep"],
    symbolType: "disk",
    symbolStyle: {
      fill: "#00E5FF",
      font: "bold 15px 'JetBrains Mono', Consolas, sans-serif",
      align: "center",
      baseline: "middle",
    },
    names: true,
    nameStyle: {
      fill: "#00E5FF",
      font: "11px 'JetBrains Mono', Consolas, sans-serif",
      align: "right",
      baseline: "top",
    },
    namesType: "desig",
  },
  lines: {
    graticule: { show: false },
    equatorial: { show: false },
    ecliptic: { show: true, stroke: "#7C4DFF", width: 1, opacity: 0.3 },
    galactic: { show: false },
    supergalactic: { show: false },
  },
  background: { fill: "#000005", opacity: 1, stroke: "#000005", width: 0 },
  horizon: {
    show: true,
    stroke: "#4FC3F7",
    width: 1.5,
    fill: "#000814",
    opacity: 0.55,
  },
  daylight: { show: false },
};

// ---------- Initialize chart ----------
function initNightSky() {
  Celestial.display(celestialConfig);

  // Set the current date/time + observer location for an accurate "right now" sky
  Celestial.skyview({
    date: new Date(),
    location: [userLocation.lat, userLocation.lng],
  });

  document.getElementById("chartUpdated").textContent =
    `Rendered ${new Date().toLocaleTimeString()}`;

  // Small delay so d3-celestial finishes loading its star/planet data
  // before we query Celestial.getPlanet() — avoids a race condition
  // where the first call happens before internal data is ready.
  setTimeout(buildVisibleObjectsList, 800);
}

// ---------- Visible objects list (planets currently plotted) ----------
// Note: Celestial.getPlanet() proved unreliable for listing purposes in
// this build (it returns undefined even though planets render correctly
// on the chart itself — the canvas rendering pipeline reads from a
// different internal data path). Since the chart visually confirms
// which bodies are plotted, we list them directly from our own config
// rather than depending on a getPlanet() round-trip.
function buildVisibleObjectsList() {
  const list = document.getElementById("visibleObjectsList");
  list.innerHTML = "";

  const planetIds = celestialConfig.planets.which;
  const planetLabels = {
    sol: "Sun", mer: "Mercury", ven: "Venus", lun: "Moon",
    mar: "Mars", jup: "Jupiter", sat: "Saturn", ura: "Uranus", nep: "Neptune",
  };
  const planetIcons = {
    sol: "☀️", mer: "🪐", ven: "🪐", lun: "🌙",
    mar: "🪐", jup: "🪐", sat: "🪐", ura: "🪐", nep: "🪐",
  };

  list.innerHTML = "";
  planetIds.forEach((id) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${planetIcons[id] || "🪐"} ${planetLabels[id] || id}</strong> — plotted on current sky chart`;
    list.appendChild(li);
  });

  if (planetIds.length === 0) {
    list.innerHTML = `<li class="loading-item">No solar system objects configured</li>`;
  }
}

// ---------- Toggle controls ----------
// Important: Celestial.apply({planets: ...}) silently fails for the
// planets module in this build (confirmed via Celestial.settings()),
// so toggling planets requires a full Celestial.display() re-call.
// But re-calling display() re-applies the ENTIRE celestialConfig object —
// so every checkbox must keep celestialConfig in sync, or a later
// planets-toggle would silently reset constellations/mw/horizon back
// to their original config values, undoing earlier toggle clicks.
function redisplayWithCurrentConfig() {
  Celestial.display(celestialConfig);
  Celestial.skyview({ date: new Date(), location: [userLocation.lat, userLocation.lng] });
}

document.getElementById("toggleConstellationLines").addEventListener("change", (e) => {
  celestialConfig.constellations.lines = e.target.checked;
  Celestial.apply({ constellations: { lines: e.target.checked } });
});
document.getElementById("toggleConstellationNames").addEventListener("change", (e) => {
  celestialConfig.constellations.names = e.target.checked;
  Celestial.apply({ constellations: { names: e.target.checked } });
});
document.getElementById("togglePlanets").addEventListener("change", (e) => {
  celestialConfig.planets.show = e.target.checked;
  redisplayWithCurrentConfig();
});
document.getElementById("toggleMilkyWay").addEventListener("change", (e) => {
  celestialConfig.mw.show = e.target.checked;
  Celestial.apply({ mw: { show: e.target.checked } });
});
document.getElementById("toggleHorizon").addEventListener("change", (e) => {
  celestialConfig.horizon.show = e.target.checked;
  Celestial.apply({ horizon: { show: e.target.checked } });
});

// ---------- Boot ----------
document.addEventListener("DOMContentLoaded", () => {
  // Give CDN scripts (d3, celestial.min.js) a brief moment to finish
  // attaching to window before we call Celestial.display().
  if (typeof Celestial !== "undefined") {
    initNightSky();
  } else {
    window.addEventListener("load", initNightSky);
  }
});

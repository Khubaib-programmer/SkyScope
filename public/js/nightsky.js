// ============================================
// Night Sky View — Constellations (d3-celestial) +
// Planets (astronomy-engine custom overlay)
//
// Why two separate systems: d3-celestial's built-in planets module
// proved unreliable across multiple CDN/version combinations during
// testing (Celestial.data stayed empty for planets specifically, while
// stars/constellations/Milky Way always rendered correctly). Astronomy
// Engine (cosinekitty/astronomy) calculates real planet positions
// independently — NASA/JPL-grade VSOP87 math, no API key, no network
// call — and we draw them as a custom SVG layer on top of the chart,
// using d3-celestial's own projection so they land in the right spot.
// ============================================

function getLocationFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const lat = parseFloat(params.get("lat"));
  const lng = parseFloat(params.get("lng"));
  const name = params.get("name");
  if (!isNaN(lat) && !isNaN(lng)) {
    return { lat, lng, name: name || "Selected Location" };
  }
  return { lat: 28.6139, lng: 77.209, name: "New Delhi, India" };
}

const userLocation = getLocationFromQuery();

document.getElementById("nightSkyLocationDisplay").innerHTML =
  `<i data-lucide="map-pin" class="icon-xs"></i> ${userLocation.name}`;
document.getElementById("nightSkyLat").textContent = userLocation.lat.toFixed(4) + "°";
document.getElementById("nightSkyLng").textContent = userLocation.lng.toFixed(4) + "°";
document.getElementById("nightSkyTime").textContent = new Date().toLocaleString();

// ---------- D3-Celestial Configuration (stars/constellations only) ----------
const celestialConfig = {
  width: 0,
  projection: "stereographic",
  transform: "equatorial",
  center: null,
  geopos: [userLocation.lat, userLocation.lng],
  follow: "zenith",
  zoomlevel: null,
  zoomextend: 10,
  adaptable: true,
  interactive: true,
  form: false,
  location: true,
  formFields: { location: false },
  container: "celestial-map",
  datapath: "https://cdn.jsdelivr.net/npm/d3-celestial@0.7.35/data/",

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
  planets: { show: false }, // disabled — we draw our own overlay instead
  lines: {
    graticule: { show: false },
    equatorial: { show: false },
    ecliptic: { show: false },
    galactic: { show: false },
    supergalactic: { show: false },
  },
  background: { fill: "#000005", opacity: 1, stroke: "#000005", width: 0 },
  horizon: { show: false },
  daylight: { show: false },
};

// ---------- Planet definitions ----------
// Astronomy.Body enum names -> display info
const PLANET_BODIES = [
  { body: "Sun", label: "Sun", icon: "☀️", color: "#FFD54F", radius: 7 },
  { body: "Moon", label: "Moon", icon: "🌙", color: "#E8EDF5", radius: 6 },
  { body: "Mercury", label: "Mercury", icon: "🪐", color: "#B0BEC5", radius: 4 },
  { body: "Venus", label: "Venus", icon: "🪐", color: "#FFF59D", radius: 5 },
  { body: "Mars", label: "Mars", icon: "🪐", color: "#FF8A65", radius: 4 },
  { body: "Jupiter", label: "Jupiter", icon: "🪐", color: "#FFCC80", radius: 6 },
  { body: "Saturn", label: "Saturn", icon: "🪐", color: "#FFE082", radius: 5 },
  { body: "Uranus", label: "Uranus", icon: "🪐", color: "#80DEEA", radius: 4 },
  { body: "Neptune", label: "Neptune", icon: "🪐", color: "#90CAF9", radius: 4 },
];

let planetsVisible = true;

/**
 * Calculate each planet's current equatorial RA/Dec using astronomy-engine,
 * then convert to the [longitude, latitude] degree pairs that d3-celestial's
 * projection expects (RA in hours -> degrees, with the -180..180 wrap
 * d3-celestial's GeoJSON convention uses).
 */
function computePlanetPositions(date) {
  const observer = new Astronomy.Observer(userLocation.lat, userLocation.lng, 0);
  const results = [];

  PLANET_BODIES.forEach((p) => {
    try {
      const equ = Astronomy.Equator(Astronomy.Body[p.body], date, observer, true, true);
      // RA is in sidereal hours (0-24); convert to degrees (0-360), then
      // wrap into d3-celestial's -180..180 longitude convention.
      let lon = equ.ra * 15;
      if (lon > 180) lon -= 360;
      results.push({ ...p, lon, lat: equ.dec });
    } catch (e) {
      console.warn(`Could not compute position for ${p.label}:`, e.message);
    }
  });

  return results;
}

/**
 * Project a planet's [lon, lat] through d3-celestial's own active
 * projection/map so it lands at the correct pixel position on the
 * current chart view (respecting rotation, zoom, and projection type).
 * Per the library's documented pattern, points must be checked with
 * Celestial.clip() first — projecting an off-view point without this
 * check can return nonsensical coordinates instead of null.
 */
function projectToScreen(lon, lat) {
  if (!Celestial || !Celestial.mapProjection || !Celestial.clip) return null;
  try {
    const coords = [lon, lat];
    if (!Celestial.clip(coords)) return null; // not currently in view
    const point = Celestial.mapProjection(coords);
    if (!point || isNaN(point[0]) || isNaN(point[1])) return null;
    return point;
  } catch (e) {
    return null;
  }
}

/**
 * Draw all planet markers as an SVG overlay on top of the chart.
 */
function renderPlanetOverlay() {
  const svg = document.getElementById("planetOverlay");
  svg.innerHTML = "";
  if (!planetsVisible) return;

  const container = document.querySelector(".nightsky-chart-container");
  const w = container.clientWidth;
  const h = container.clientHeight;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

  const positions = computePlanetPositions(new Date());

  positions.forEach((p) => {
    const point = projectToScreen(p.lon, p.lat);
    if (!point) return; // below horizon or off current view

    const [x, y] = point;
    // Skip if projected outside the visible chart area (NaN/Infinity guard
    // plus a loose bounds check so off-screen points don't clutter the DOM)
    if (x < -50 || x > w + 50 || y < -50 || y > h + 50) return;

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "planet-marker");
    g.setAttribute("transform", `translate(${x}, ${y})`);

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", p.radius);
    circle.setAttribute("fill", p.color);
    circle.setAttribute("style", `color: ${p.color}`);
    g.appendChild(circle);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", p.radius + 4);
    label.setAttribute("y", 4);
    label.textContent = p.label;
    g.appendChild(label);

    svg.appendChild(g);
  });
}

// ---------- Initialize chart ----------
function initNightSky() {
  Celestial.display(celestialConfig);
  Celestial.skyview({
    date: new Date(),
    location: [userLocation.lat, userLocation.lng],
  });

  document.getElementById("chartUpdated").textContent =
    `Rendered ${new Date().toLocaleTimeString()}`;

  // Draw planets once the chart has settled, then keep them in sync
  // with any rotation/zoom interaction on the chart.
  setTimeout(renderPlanetOverlay, 600);
  buildVisibleObjectsList();

  // Re-draw planet positions whenever the user drags/zooms the chart,
  // and periodically to account for the sky's slow drift over time.
  const chartEl = document.getElementById("celestial-map");
  if (chartEl) {
    ["mousemove", "wheel", "touchmove"].forEach((evt) => {
      chartEl.addEventListener(evt, () => {
        if (planetsVisible) requestAnimationFrame(renderPlanetOverlay);
      });
    });
  }
  setInterval(() => { if (planetsVisible) renderPlanetOverlay(); }, 30000);
  window.addEventListener("resize", () => { if (planetsVisible) renderPlanetOverlay(); });
}

// ---------- Visible objects list ----------
function buildVisibleObjectsList() {
  const list = document.getElementById("visibleObjectsList");
  const positions = computePlanetPositions(new Date());
  list.innerHTML = "";

  if (positions.length === 0) {
    list.innerHTML = `<li class="loading-item">No solar system objects resolved</li>`;
    return;
  }

  positions.forEach((p) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${p.icon} ${p.label}</strong> — plotted on current sky chart`;
    list.appendChild(li);
  });
}

// ---------- Toggle controls ----------
document.getElementById("toggleConstellationLines").addEventListener("change", (e) => {
  Celestial.apply({ constellations: { lines: e.target.checked } });
});
document.getElementById("toggleConstellationNames").addEventListener("change", (e) => {
  Celestial.apply({ constellations: { names: e.target.checked } });
});
document.getElementById("togglePlanets").addEventListener("change", (e) => {
  planetsVisible = e.target.checked;
  renderPlanetOverlay();
});
document.getElementById("toggleMilkyWay").addEventListener("change", (e) => {
  Celestial.apply({ mw: { show: e.target.checked } });
});

// ---------- Boot ----------
document.addEventListener("DOMContentLoaded", () => {
  if (typeof Celestial !== "undefined" && typeof Astronomy !== "undefined") {
    initNightSky();
  } else {
    window.addEventListener("load", initNightSky);
  }
});

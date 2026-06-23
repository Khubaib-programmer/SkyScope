// ============================================
// Main App Logic — screen navigation + data binding
// ============================================

let currentLocation = { ...CONFIG.DEFAULT_LOCATION };
let refreshTimer = null;
let clickHandlerInitialized = false;
let hasAutoZoomed = false;

// TLE data cache (client-side)
let tleData = { stations: [], active: [] };
let tleLastFetched = 0;
const TLE_REFRESH_INTERVAL = 1000 * 60 * 60 * 2; // 2 hours

// Compare mode viewers
let compareViewerA = null;
let compareViewerB = null;

// ---------- Toast Notification System ----------
function showToast(message, type = "info", duration = 4000) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const icons = { info: "ℹ️", success: "✅", error: "⚠️" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || ""}</span> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ---------- Loading Overlay ----------
function hideLoadingOverlay() {
  const overlay = document.getElementById("loadingOverlay");
  if (!overlay) return;
  overlay.classList.add("fade-out");
  setTimeout(() => overlay.remove(), 600);
}

// ---------- Server Health Check ----------
async function checkServerHealth() {
  const badge = document.getElementById("serverStatus");
  try {
    const res = await fetch(`${CONFIG.BACKEND_URL}/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      badge.className = "status-badge online";
      badge.textContent = "● Connected";
      return true;
    }
  } catch (e) { /* server offline */ }
  badge.className = "status-badge offline";
  badge.textContent = "● Offline";
  return false;
}

// ---------- Screen Navigation ----------
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  // Manage starfield lifecycle to prevent memory leaks
  if (id === "landing") {
    resumeStarfield();
  } else {
    stopStarfield();
  }
}

// ---------- Landing Page Actions ----------
async function handleSearch() {
  const input = document.getElementById("locationInput");
  const query = input.value.trim();
  if (!query) {
    input.focus();
    showToast("Please enter a city or place name", "info");
    return;
  }

  showToast(`🔍 Searching for "${query}"...`, "info", 2000);

  const result = await SkyAPI.geocodeLocation(query);
  if (result) {
    currentLocation = result;
    showToast(`📍 Found: ${result.name.split(",").slice(0, 2).join(",")}`, "success", 2500);
    enterDashboard();
  } else {
    showToast("Location not found. Try a different search.", "error");
  }
}

document.getElementById("searchBtn").addEventListener("click", handleSearch);
document.getElementById("locationInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSearch();
});

document.getElementById("useMyLocationBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    showToast("Geolocation not supported by your browser.", "error");
    return;
  }
  showToast("📡 Getting your location...", "info", 2000);
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      currentLocation = {
        name: "Your Current Location",
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      showToast("📍 Location acquired!", "success", 2000);
      enterDashboard();
    },
    () => showToast("Could not get your location. Please search manually.", "error")
  );
});

document.getElementById("backBtn").addEventListener("click", () => {
  clearInterval(refreshTimer);
  showScreen("landing");
});

// ---------- Loading Skeleton for Satellite List ----------
function showSatelliteListSkeleton() {
  const list = document.getElementById("satelliteList");
  let html = "";
  for (let i = 0; i < 5; i++) {
    html += `<li class="skeleton-item"><div class="skeleton-line long"></div><div class="skeleton-line short"></div></li>`;
  }
  list.innerHTML = html;
}

// ---------- Dashboard ----------
async function enterDashboard() {
  showScreen("dashboard");
  document.getElementById("currentLocationDisplay").innerHTML =
    `<i data-lucide="map-pin" class="icon-xs"></i> ${currentLocation.name}`;
  if (typeof lucide !== "undefined") lucide.createIcons();
  showSatelliteListSkeleton();

  if (!viewer) initGlobe("cesiumContainer");

  hasAutoZoomed = false;
  clearLocationMarkers();
  flyToLocation(currentLocation.lat, currentLocation.lng);
  addLocationMarker(currentLocation.lat, currentLocation.lng, currentLocation.name);

  // Only set up click handler once to avoid memory leaks
  if (!clickHandlerInitialized) {
    setupSatelliteClickHandler(openSatelliteModal);
    clickHandlerInitialized = true;
  }

  await refreshDashboardData();
  clearInterval(refreshTimer);
  refreshTimer = setInterval(refreshDashboardData, CONFIG.REFRESH_INTERVAL);
}

// Fetch and cache TLE data from CelesTrak
async function ensureTLEData() {
  const now = Date.now();
  if (tleData.stations.length && now - tleLastFetched < TLE_REFRESH_INTERVAL) return;
  const [stationsRes, activeRes] = await Promise.all([
    SkyAPI.getTLEs("stations"),
    SkyAPI.getTLEs("active"),
  ]);
  tleData.stations = stationsRes.satellites || [];
  tleData.active = activeRes.satellites || [];
  tleLastFetched = now;
}

async function refreshDashboardData() {
  const { lat, lng } = currentLocation;

  // Set loading indicators
  const loadingHTML = '<span class="data-loading"></span>';
  ["moonPhase", "cloudCover", "visibility", "issNextPass"].forEach((id) => {
    const el = document.getElementById(id);
    if (el.textContent === "--") el.innerHTML = loadingHTML;
  });

  // Fetch TLE data and compute overhead satellites via SGP4
  await ensureTLEData();
  const candidatePool = [...tleData.stations, ...tleData.active.slice(0, 400)];
  const overheadSats = Orbital.filterOverhead(candidatePool, lat, lng, 20);

  const [issData, astroData, weatherData] = await Promise.all([
    SkyAPI.getISSInfo(lat, lng),
    SkyAPI.getAstronomyData(lat, lng),
    SkyAPI.getWeather(lat, lng),
  ]);

  // Render satellites on globe
  renderSatellites(overheadSats);

  if (!hasAutoZoomed && overheadSats.length > 0) {
    viewer.zoomTo(viewer.entities);
    hasAutoZoomed = true;
  }

  // Update satellite list panel
  const list = document.getElementById("satelliteList");
  list.innerHTML = "";
  if (overheadSats.length === 0) {
    list.innerHTML = `<li class="loading-item">No tracked objects overhead right now</li>`;
  } else {
    overheadSats.forEach((sat, i) => {
      const li = document.createElement("li");
      const speedLabel = sat.speed ? `${sat.speed} km/s` : "";
      li.innerHTML = `<strong>${sat.name}</strong> — ${sat.altitude} km ${speedLabel ? `· ${speedLabel}` : ""}`;
      li.style.animationDelay = `${i * 50}ms`;
      li.addEventListener("click", () => openSatelliteModal(sat));
      list.appendChild(li);
    });
  }
  document.getElementById("satCountPreview").textContent = overheadSats.length;

  // Update sky condition panel
  document.getElementById("moonPhase").textContent = astroData.moonPhase || "--";
  document.getElementById("cloudCover").textContent = weatherData.cloudCover || "--";
  document.getElementById("visibility").textContent = weatherData.visibility || "--";
  document.getElementById("issNextPass").textContent = issData.nextPass || "--";

  // Bottom bar
  document.getElementById("bottomMoon").textContent = astroData.moonPhase || "--";
  document.getElementById("bottomISS").textContent = issData.nextPass || "--";
  document.getElementById("bottomWeather").textContent = weatherData.cloudCover || "--";

  // Viewing conditions heuristic
  const spotBox = document.getElementById("viewingSpotResult");
  const cloudVal = parseFloat(weatherData.cloudCover);
  if (!isNaN(cloudVal) && cloudVal < 30) {
    spotBox.innerHTML = "✅ <strong>Clear skies nearby</strong> — great conditions for stargazing tonight!";
  } else if (!isNaN(cloudVal) && cloudVal < 60) {
    spotBox.innerHTML = "🌤️ <strong>Partial cloud cover</strong> — some objects may still be visible.";
  } else {
    spotBox.innerHTML = "⚠️ <strong>Heavy cloud cover</strong> — visibility may be limited tonight.";
  }

  document.getElementById("lastUpdated").textContent =
    `Updated ${new Date().toLocaleTimeString()}`;
}

// ---------- Satellite Modal ----------
function openSatelliteModal(sat) {
  document.getElementById("modalSatName").textContent = sat.name;
  document.getElementById("modalType").textContent = sat.type || "Unknown";
  document.getElementById("modalAltitude").textContent = `${sat.altitude} km`;
  document.getElementById("modalSpeed").textContent = sat.speed ? `${sat.speed} km/s` : "--";
  document.getElementById("modalCountry").textContent = sat.country || "Unknown";
  document.getElementById("satModal").classList.remove("hidden");

  // Store TLE data on modal for orbit path
  const modal = document.getElementById("satModal");
  modal.dataset.satName = sat.name;
  modal.dataset.tle1 = sat.tle1 || "";
  modal.dataset.tle2 = sat.tle2 || "";
}

document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("satModal").classList.add("hidden");
});
document.getElementById("satModal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) {
    document.getElementById("satModal").classList.add("hidden");
  }
});

// Show predicted orbit path via SGP4
document.getElementById("showOrbitBtn").addEventListener("click", () => {
  const modal = document.getElementById("satModal");
  const { satName, tle1, tle2 } = modal.dataset;
  if (!tle1 || !tle2) {
    showToast("Orbit data unavailable for this object.", "error");
    return;
  }
  const path = Orbital.getOrbitPath(satName, tle1, tle2, 95, 60);
  drawOrbitPath(path, "#7C4DFF");
  showToast(`🛰️ Showing predicted orbit for ${satName}`, "success");
  modal.classList.add("hidden");
});

// ---------- Night Sky View Navigation ----------
document.getElementById("nightSkyBtn").addEventListener("click", () => {
  const params = new URLSearchParams({
    lat: currentLocation.lat,
    lng: currentLocation.lng,
    name: currentLocation.name,
  });
  window.location.href = `nightsky.html?${params.toString()}`;
});

// ---------- Compare Mode ----------
document.getElementById("compareBtn").addEventListener("click", () => {
  clearInterval(refreshTimer);
  showScreen("compareScreen");
  showToast("Enter two locations and press Enter to compare", "info");

  // Initialize compare globe viewers
  try {
    if (!compareViewerA) {
      compareViewerA = initGlobe("cesiumContainerA");
    }
    if (!compareViewerB) {
      compareViewerB = initGlobe("cesiumContainerB");
    }
  } catch (err) {
    console.error("Compare mode init error:", err);
    showToast("Failed to initialize compare globes", "error");
  }
});

// Geocode + fly for compare mode inputs
async function handleCompareInput(inputId, targetViewer) {
  const input = document.getElementById(inputId);
  const query = input.value.trim();
  if (!query || !targetViewer) return;

  showToast(`🔍 Searching "${query}"...`, "info", 2000);
  const result = await SkyAPI.geocodeLocation(query);
  if (result) {
    targetViewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(result.lng, result.lat, 15000000),
      duration: 2,
    });
    targetViewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(result.lng, result.lat),
      point: {
        pixelSize: 12,
        color: Cesium.Color.fromCssColorString("#4FC3F7"),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
      },
      label: {
        text: result.name.split(",").slice(0, 2).join(","),
        font: "13px sans-serif",
        fillColor: Cesium.Color.WHITE,
        pixelOffset: new Cesium.Cartesian2(0, -20),
      },
    });
    showToast(`📍 ${result.name.split(",").slice(0, 2).join(",")}`, "success", 2000);
  } else {
    showToast("Location not found.", "error");
  }
}

document.getElementById("locationA").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleCompareInput("locationA", compareViewerA);
});
document.getElementById("locationB").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleCompareInput("locationB", compareViewerB);
});

document.getElementById("exitCompareBtn").addEventListener("click", () => {
  showScreen("dashboard");
  refreshTimer = setInterval(refreshDashboardData, CONFIG.REFRESH_INTERVAL);
});

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", async () => {
  await checkServerHealth();
  setTimeout(hideLoadingOverlay, 1200);
});

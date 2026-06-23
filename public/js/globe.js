// ============================================
// 3D Globe — powered by CesiumJS
// ============================================

let viewer = null;
let satelliteEntities = [];
let locationMarkerEntities = [];
let orbitPathEntity = null;

function initGlobe(containerId = "cesiumContainer") {
  try {
    Cesium.Ion.defaultAccessToken = CONFIG.CESIUM_ION_TOKEN;

    const v = new Cesium.Viewer(containerId, {
      timeline: false,
      animation: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      selectionIndicator: true,
      infoBox: false,
    });

    v.scene.backgroundColor = Cesium.Color.fromCssColorString("#000005");
    v.scene.globe.enableLighting = true;

    // Only set the module-level viewer for the main globe
    if (containerId === "cesiumContainer") {
      viewer = v;
    }
    return v;
  } catch (err) {
    console.error("CesiumJS initialization failed:", err);
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#7B8BA8;font-family:sans-serif;text-align:center;padding:40px;">' +
        '⚠️ 3D Globe failed to load.<br>Check your Cesium Ion token in config.js</div>';
    }
    return null;
  }
}

// Fly camera to a specific lat/lng
function flyToLocation(lat, lng, height = 15000000) {
  if (!viewer) return;
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lng, lat, height),
    duration: 2,
  });
}

// Add a marker pin for the user's chosen location
function addLocationMarker(lat, lng, label = "Your Location") {
  if (!viewer) return;
  const entity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lng, lat),
    point: {
      pixelSize: 12,
      color: Cesium.Color.fromCssColorString("#4FC3F7"),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
    },
    label: {
      text: label,
      font: "13px sans-serif",
      fillColor: Cesium.Color.WHITE,
      pixelOffset: new Cesium.Cartesian2(0, -20),
    },
  });
  locationMarkerEntities.push(entity);
}

// Clear previous location markers
function clearLocationMarkers() {
  if (!viewer) return;
  locationMarkerEntities.forEach((e) => viewer.entities.remove(e));
  locationMarkerEntities = [];
}

// Clear all satellite markers before re-rendering
function clearSatellites() {
  if (!viewer) return;
  satelliteEntities.forEach((e) => viewer.entities.remove(e));
  satelliteEntities = [];
}

// Draw predicted orbit path on globe
function drawOrbitPath(pathPoints, color = "#7C4DFF") {
  if (!viewer) return;
  clearOrbitPath();
  if (!pathPoints || pathPoints.length < 2) return;

  const positions = pathPoints.map((p) =>
    Cesium.Cartesian3.fromDegrees(p.lng, p.lat, p.altitude * 1000)
  );

  orbitPathEntity = viewer.entities.add({
    polyline: {
      positions,
      width: 2,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.25,
        color: Cesium.Color.fromCssColorString(color),
      }),
      clampToGround: false,
    },
  });
}

// Clear orbit path
function clearOrbitPath() {
  if (!viewer || !orbitPathEntity) return;
  viewer.entities.remove(orbitPathEntity);
  orbitPathEntity = null;
}

// Render satellites as dots above the globe
function renderSatellites(satellites) {
  if (!viewer) return;
  clearSatellites();

  satellites.forEach((sat) => {
    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(
        sat.lng,
        sat.lat,
        sat.altitude * 1000 // km to meters
      ),
      point: {
        pixelSize: 8,
        color: Cesium.Color.fromCssColorString(sat.color || "#7C4DFF"),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 1,
      },
      label: {
        text: sat.name,
        font: "11px sans-serif",
        fillColor: Cesium.Color.fromCssColorString("#B3E5FC"),
        pixelOffset: new Cesium.Cartesian2(0, -16),
        show: false, // show only on hover/click to avoid clutter
      },
      // store raw data for click handling
      satData: sat,
    });
    satelliteEntities.push(entity);
  });
}

// Handle clicking on a satellite to show details
function setupSatelliteClickHandler(onSatelliteClick) {
  if (!viewer) return;
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction((click) => {
    const picked = viewer.scene.pick(click.position);
    if (Cesium.defined(picked) && picked.id && picked.id.satData) {
      onSatelliteClick(picked.id.satData);
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

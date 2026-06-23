// ============================================
// API Layer — talks to OUR backend (server/index.js)
// which securely proxies to N2YO, AstronomyAPI, etc.
// ============================================

const SkyAPI = {

  // Get satellites currently overhead a lat/lng
  async getSatellitesOverhead(lat, lng) {
    try {
      const res = await fetch(`${CONFIG.BACKEND_URL}/satellites?lat=${lat}&lng=${lng}`);
      if (!res.ok) throw new Error("Satellite fetch failed");
      return await res.json();
    } catch (err) {
      console.error("getSatellitesOverhead error:", err);
      return { satellites: [] };
    }
  },

  // Get ISS current position + next pass time for a location
  async getISSInfo(lat, lng) {
    try {
      const res = await fetch(`${CONFIG.BACKEND_URL}/iss?lat=${lat}&lng=${lng}`);
      if (!res.ok) throw new Error("ISS fetch failed");
      return await res.json();
    } catch (err) {
      console.error("getISSInfo error:", err);
      return { nextPass: "Unavailable", position: null };
    }
  },

  // Get moon phase data
  async getAstronomyData(lat, lng) {
    try {
      const res = await fetch(`${CONFIG.BACKEND_URL}/astronomy?lat=${lat}&lng=${lng}`);
      if (!res.ok) throw new Error("Astronomy fetch failed");
      return await res.json();
    } catch (err) {
      console.error("getAstronomyData error:", err);
      return { moonPhase: "Unknown" };
    }
  },

  // Get weather/cloud cover for viewing conditions
  async getWeather(lat, lng) {
    try {
      const res = await fetch(`${CONFIG.BACKEND_URL}/weather?lat=${lat}&lng=${lng}`);
      if (!res.ok) throw new Error("Weather fetch failed");
      return await res.json();
    } catch (err) {
      console.error("getWeather error:", err);
      return { cloudCover: "N/A", visibility: "N/A" };
    }
  },

  // Fetch TLE data from CelesTrak via backend cache
  async getTLEs(group = "stations") {
    try {
      const res = await fetch(`${CONFIG.BACKEND_URL}/tle?group=${group}`);
      if (!res.ok) throw new Error("TLE fetch failed");
      return await res.json();
    } catch (err) {
      console.error("getTLEs error:", err);
      return { satellites: [] };
    }
  },

  // Geocode a place name into lat/lng (uses free OpenStreetMap Nominatim)
  async geocodeLocation(placeName) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeName)}&limit=1`,
        {
          signal: controller.signal,
          headers: { "User-Agent": "SkyScope/1.0 (hackathon project)" }
        }
      );
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!data.length) return null;
      return {
        name: data[0].display_name,
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    } catch (err) {
      console.error("geocodeLocation error:", err);
      return null;
    }
  }
};

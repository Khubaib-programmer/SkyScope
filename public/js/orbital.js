// ============================================
// Orbital Mechanics Module
// Uses satellite.js (SGP4/SDP4 propagator) to turn raw CelesTrak
// TLE data into real-time satellite positions, velocity, and
// predicted orbit paths.
// ============================================

const Orbital = {
  satrecCache: new Map(),

  /**
   * Build (or retrieve cached) SGP4 satrec object from a TLE pair.
   */
  getSatrec(name, tle1, tle2) {
    if (this.satrecCache.has(name)) return this.satrecCache.get(name);
    const satrec = satellite.twoline2satrec(tle1, tle2);
    this.satrecCache.set(name, satrec);
    return satrec;
  },

  /**
   * Propagate a satellite to a specific Date and return geodetic
   * position (lat/lng in degrees, altitude in km) plus real orbital
   * speed in km/s.
   */
  propagate(name, tle1, tle2, date = new Date()) {
    const satrec = this.getSatrec(name, tle1, tle2);
    const posVel = satellite.propagate(satrec, date);
    if (!posVel || !posVel.position) return null;

    const gmst = satellite.gstime(date);
    const geodetic = satellite.eciToGeodetic(posVel.position, gmst);

    const lat = satellite.degreesLat(geodetic.latitude);
    const lng = satellite.degreesLong(geodetic.longitude);
    const altitude = geodetic.height;

    let speed = null;
    if (posVel.velocity) {
      const { x, y, z } = posVel.velocity;
      speed = Math.sqrt(x * x + y * y + z * z);
    }

    return { lat, lng, altitude, speed };
  },

  /**
   * Predict the orbit path for the next `minutes` of flight, sampled
   * every `stepSeconds`. Returns an array of {lat, lng, altitude}.
   */
  getOrbitPath(name, tle1, tle2, minutes = 95, stepSeconds = 60) {
    const satrec = this.getSatrec(name, tle1, tle2);
    const path = [];
    const now = Date.now();
    const steps = Math.floor((minutes * 60) / stepSeconds);

    for (let i = 0; i <= steps; i++) {
      const t = new Date(now + i * stepSeconds * 1000);
      const posVel = satellite.propagate(satrec, t);
      if (!posVel || !posVel.position) continue;
      const gmst = satellite.gstime(t);
      const geodetic = satellite.eciToGeodetic(posVel.position, gmst);
      path.push({
        lat: satellite.degreesLat(geodetic.latitude),
        lng: satellite.degreesLong(geodetic.longitude),
        altitude: geodetic.height,
      });
    }
    return path;
  },

  /**
   * Filter satellites to those currently within visual range of an
   * observer's lat/lng using great-circle angular distance.
   */
  filterOverhead(satellites, observerLat, observerLng, maxSatellites = 20) {
    const date = new Date();
    const results = [];

    for (const sat of satellites) {
      const pos = this.propagate(sat.name, sat.tle1, sat.tle2, date);
      if (!pos) continue;

      const dist = this.angularDistance(observerLat, observerLng, pos.lat, pos.lng);
      const visibilityRadius = pos.altitude > 2000 ? 60 : pos.altitude > 800 ? 35 : 20;

      if (dist <= visibilityRadius) {
        results.push({
          name: sat.name,
          lat: pos.lat,
          lng: pos.lng,
          altitude: Math.round(pos.altitude),
          speed: pos.speed ? pos.speed.toFixed(2) : null,
          type: "Satellite",
          country: "Unknown",
          color: "#7C4DFF",
          tle1: sat.tle1,
          tle2: sat.tle2,
        });
      }
    }

    results.sort((a, b) => a.altitude - b.altitude);
    return results.slice(0, maxSatellites);
  },

  /**
   * Great-circle angular distance in degrees (haversine).
   */
  angularDistance(lat1, lng1, lat2, lng2) {
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (c * 180) / Math.PI;
  },
};

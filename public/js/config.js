// ============================================
// SkyScope Configuration
// ============================================
// All real API keys live SERVER-SIDE only (server/.env)
// The frontend calls OUR backend, which then calls the
// real APIs. This keeps your API keys safe & hidden.

const CONFIG = {
  // Auto-detect backend URL so it works on localhost AND deployment
  BACKEND_URL: `${window.location.origin}/api`,

  // Default location (used until user picks one)
  DEFAULT_LOCATION: {
    name: "New Delhi, India",
    lat: 28.6139,
    lng: 77.2090
  },

  // How often to refresh live satellite data (ms)
  REFRESH_INTERVAL: 30000,

  // CesiumJS — get a free Ion token from https://cesium.com/ion/signup
  CESIUM_ION_TOKEN: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI3NDg2YzgxZC01YzM2LTRmNWUtODRkMy04ZTNjYzAyYmZiODIiLCJpZCI6NDQ2MDQyLCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3ODE3NjM3OTl9.KL0wrFyeED329alQPrHO9f_UwRdAwmmRvUcbtX6yuB8"
};

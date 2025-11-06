// Maximum number of photos allowed per entry
export const MAX_PHOTOS_PER_ENTRY = 5;

// Maximum dimension (width or height) for uploaded images in pixels
export const MAX_IMAGE_DIMENSION = 1600;

// Maximum entry number for random assignment (0 to MAX_ENTRY_NUMBER)
// After all numbers in this range are used, new entries will get MAX_ENTRY_NUMBER + 1, etc.
export const MAX_ENTRY_NUMBER = 40;

// Geographic boundary for competition entries (Port Geographe/Busselton area, WA, Australia)
// Entries outside this boundary will be rejected
export const COMPETITION_GEOGRAPHIC_BOUNDARY = {
  // Southwest corner (lowest lat/lng)
  southWest: {
    lat: -33.642727,
    lng: 115.383709,
  },
  // Northeast corner (highest lat/lng)
  northEast: {
    lat: -33.623074,
    lng: 115.401862,
  },
} as const;

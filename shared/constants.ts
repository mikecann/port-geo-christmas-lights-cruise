// Maximum number of photos allowed per entry
export const MAX_PHOTOS_PER_ENTRY = 5;

// Maximum dimension (width or height) for uploaded images in pixels
export const MAX_IMAGE_DIMENSION = 1600;

// What the server accepts when a photo upload is saved
export const ALLOWED_PHOTO_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
export const MAX_PHOTO_UPLOAD_BYTES = 5 * 1024 * 1024;

// Longest text we accept, measured after trimming
export const MAX_ENTRY_NAME_LENGTH = 80;
export const MAX_ENTRY_ADDRESS_LENGTH = 200;
export const MAX_REJECTED_REASON_LENGTH = 1000;

// New entrants get a random free number in the competition's range, inclusive.
// A sign is printed per number, so admins can change it per competition.
export const DEFAULT_ENTRY_NUMBER_RANGE = { min: 1, max: 60 };

// Where a voter's IP has to be for their vote to count as in person. Mobile
// carriers sometimes place WA phones in other states, so it's Australia-wide
// unless an admin narrows it to WA.
export const DEFAULT_IN_PERSON_AREA = {
  countries: ["AU"],
  waOnly: false,
};

// The biggest number an admin can give an entry or a range
export const MAX_ENTRY_NUMBER = 9999;

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

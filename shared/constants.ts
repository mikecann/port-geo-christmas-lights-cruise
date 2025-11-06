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

export const usersWhiteList = [
  {
    name: "Alli Torony",
    email: "allikat7@iprimus.com.au",
  },
  {
    name: "Andrea",
    email: "Randhes@bigpond.com",
  },
  {
    name: "Dave Julie Ebert",
    email: "djebert6@gmail.com",
  },
  {
    name: "Glen Barkla",
    email: "gbarkla@bigpond.net.au",
  },
  {
    name: "Graham Doust",
    email: "doustagriservices@westnet.com.au",
  },
  {
    name: "Jason and Tamny",
    email: "jts76@bigpond.com",
  },
  {
    name: "Jason Offer",
    email: "offer7@bigpond.com",
  },
  {
    name: "Jen McAloon",
    email: "mcaloon_clan@bigpond.com",
  },
  {
    name: "Julie Kelly",
    email: "Jaryli@karriweb.com.au",
  },
  {
    name: "Lesley coulter",
    email: "lesley.coulter@hotmail.com",
  },
  {
    name: "Liz wright",
    email: "Lizwright389@gmail.com",
  },
  {
    name: "Ly Hoang and Kin Lee",
    email: "Jascharess@yahoo.com",
  },
  {
    name: "Marilyn Riggs",
    email: "marilyn.riggs@live.com.au",
  },
  {
    name: "Michael Goss",
    email: "aussiemfg@hotmail.com",
  },
  {
    name: "Michelle Baker",
    email: "phil@forkwest.com.au",
  },
  {
    name: "Michelle Camus",
    email: "shell.louise1979@gmail.com",
  },
  {
    name: "Mike Cann",
    email: "mike.cann@gmail.com",
  },
  {
    name: "Rosa McGillivray",
    email: "rosamcgillivray@gmail.com",
  },
  {
    name: "Sharon Morris",
    email: "shaznsw@hotmail.com",
  },
  {
    name: "Simon Pauline Rudge",
    email: "greentea1965@outlook.com",
  },
  {
    name: "Suzan Edmunds",
    email: "suzangay62@gmail.com",
  },
  {
    name: "Tanya Bertram",
    email: "tanya.bartram@hotmail.com",
  },
  {
    name: "Tanya May",
    email: "tanymay@yahoo.com.au",
  },
  {
    name: "Tenille Jason Duggan",
    email: "tenilleduggan@yahoo.con",
  },
  {
    name: "Tony Roper",
    email: "tonyroper@bigpond.com",
  },
  {
    name: "Troy and Jennnifer Evans",
    email: "evo.32@bigpond.com",
  },
];

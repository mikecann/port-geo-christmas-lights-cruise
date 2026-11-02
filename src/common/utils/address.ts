// Google's formatted addresses can end in ", Australia", which says nothing to
// people standing in Port Geographe
export const shortAddress = (address: string) =>
  address.replace(/,\s*Australia$/i, "");

// Google Maps directions to a house: opens the Maps app on a phone
export const directionsUrl = ({ lat, lng }: { lat: number; lng: number }) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

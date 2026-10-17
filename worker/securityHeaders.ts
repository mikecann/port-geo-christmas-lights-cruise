// Only frame-ancestors for CSP: a full policy would need careful allow-listing
// for Google Maps, PostHog and Convex.
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "frame-ancestors 'none'",
  // The map asks for the visitor's location
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
  "Strict-Transport-Security": "max-age=31536000",
};

export function withSecurityHeaders(response: Response): Response {
  // Asset responses have immutable headers, so copy before adding to them
  const secured = new Response(response.body, response);
  for (const [name, value] of Object.entries(SECURITY_HEADERS))
    if (!secured.headers.has(name)) secured.headers.set(name, value);
  return secured;
}

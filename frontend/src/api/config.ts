/**
 * API origin for fetch calls.
 * - Local Vite: leave unset (empty) so `/api` is proxied to localhost:4000
 * - Render static site: set VITE_API_URL at build time to the Nest service URL
 *   e.g. https://construction-erp-api.onrender.com (no trailing slash)
 */
export const API_BASE = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

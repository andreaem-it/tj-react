/**
 * Autenticazione route admin Price Radar: header
 * `Authorization: Bearer <PRICE_RADAR_ADMIN_SECRET>`
 * (condiviso con il pannello admin separato).
 */
export function isPriceRadarAdminRequest(request: Request): boolean {
  const secret = process.env.PRICE_RADAR_ADMIN_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export function isPriceRadarAdminConfigured(): boolean {
  return Boolean(process.env.PRICE_RADAR_ADMIN_SECRET?.trim());
}

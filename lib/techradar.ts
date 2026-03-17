import { API_BASE } from "@/lib/constants";

/** TechRadar API - Price Radar backend (quando PA-API è attiva). */
export const TECHRADAR_API_BASE =
  process.env.NEXT_PUBLIC_TECHRADAR_API_BASE ?? `${API_BASE}/techradar/api`;

export interface TechRadarOffer {
  title: string;
  price: number;
  previous_avg_price: number;
  discount_percent: number;
  image: string;
  url: string;
  asin: string;
  created_at: string;
}

export type SortOption = "discount" | "newest" | "price";

/**
 * Abilita Price Radar con dati live (PA-API / backend TechRadar).
 * Quando è false e PRICE_RADAR_BETA_ENABLED è true, viene usato il connettore JSON beta.
 */
export const PRICE_RADAR_ENABLED =
  process.env.NEXT_PUBLIC_PRICE_RADAR_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_PRICE_RADAR_ENABLED === "1";

/** Abilita la versione Beta che usa il dataset JSON interno. */
export const PRICE_RADAR_BETA_ENABLED =
  process.env.NEXT_PUBLIC_PRICE_RADAR_BETA_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_PRICE_RADAR_BETA_ENABLED === "1";


import { API_BASE } from "@/lib/constants";

/**
 * TechRadar API - Price Radar backend
 * Usa API_BASE (api.techjournal.it) per le chiamate dati.
 */
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

/** Abilita Price Radar quando PA-API Amazon è attiva. Default: false (Coming Soon) */
export const PRICE_RADAR_ENABLED =
  process.env.NEXT_PUBLIC_PRICE_RADAR_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_PRICE_RADAR_ENABLED === "1";

export type TrackingStatus = "active" | "paused";
export type PriorityLevel = "hot" | "warm" | "cold";
export type Availability = "in_stock" | "out_of_stock" | "unknown";
export type HistoryRange = "7d" | "30d" | "90d" | "max";

export interface ProductRow {
  id: number;
  asin: string;
  source: string;
  url: string;
  canonical_url: string | null;
  title: string | null;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  current_price: number | null;
  currency: string;
  availability: string;
  last_seen_at: string | null;
  last_checked_at: string | null;
  last_price_change_at: string | null;
  first_tracked_at: string;
  tracking_status: string;
  priority_level: string;
  score: number;
  check_interval_minutes: number;
  next_check_at: string;
  consecutive_failures: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductMetricsRow {
  id: number;
  product_id: number;
  views_24h: number;
  clicks_24h: number;
  article_mentions: number;
  manual_boost: number;
  last_interest_at: string | null;
  views_period_start: string | null;
  clicks_period_start: string | null;
  updated_at: string;
}

export interface PriceRadarProductListItem {
  id: number;
  asin: string;
  title: string | null;
  image_url: string | null;
  url: string;
  current_price: number | null;
  currency: string;
  availability: Availability;
  min_price_30d: number | null;
  /** Picco prezzo ultimi 30g (per confronto / barrato in card). */
  max_price_30d: number | null;
  discount_percent: number;
  last_checked_at: string | null;
  last_price_change_at: string | null;
  priority_level: PriorityLevel;
  score: number;
}

export interface PriceHistoryPoint {
  t: string;
  price: number;
}

export interface PriceHistoryStats {
  current: number | null;
  min: number | null;
  max: number | null;
  avg: number | null;
}

export interface PriceHistoryResponse {
  range: HistoryRange;
  points: PriceHistoryPoint[];
  stats: PriceHistoryStats;
}

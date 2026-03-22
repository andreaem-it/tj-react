"use client";

import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

/** ISO 3166-1 alpha-2 → numeric (world-atlas@2 usa id numerico) */
const ISO2_TO_NUMERIC: Record<string, string> = {
  IT: "380",
  US: "840",
  DE: "276",
  FR: "250",
  GB: "826",
  ES: "724",
  NL: "528",
  BR: "076",
  IN: "356",
  CN: "156",
  JP: "392",
  RU: "643",
  CA: "124",
  AU: "036",
  PL: "616",
  BE: "056",
  CH: "756",
  AT: "040",
  PT: "620",
  SE: "752",
  NO: "578",
  FI: "246",
  DK: "208",
  IE: "372",
  NZ: "554",
  MX: "484",
  AR: "032",
  ZA: "710",
  TR: "792",
  GR: "300",
  RO: "642",
  CZ: "203",
  HU: "348",
  UA: "804",
};

type Props = {
  usersByCountry: Array<{ countryId: string; country: string; activeUsers: number }>;
};

export default function WorldMapByCountry({ usersByCountry }: Props) {
  const byId = new Map<string, number>();
  for (const row of usersByCountry) {
    const id = ISO2_TO_NUMERIC[row.countryId] ?? row.countryId;
    byId.set(id, (byId.get(id) ?? 0) + row.activeUsers);
  }
  const maxUsers = Math.max(1, ...byId.values());

  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{ scale: 120 }}
      className="w-full"
    >
      <Geographies geography={GEO_URL}>
        {({ geographies }) =>
          geographies.map((geo) => {
            const id = String(geo.id ?? "");
            const count = byId.get(id) ?? 0;
            const fill =
              count > 0
                ? `rgba(34, 197, 94, ${0.3 + 0.7 * (count / maxUsers)})`
                : "rgba(255,255,255,0.06)";
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={fill}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={0.5}
                style={{ outline: "none" }}
              />
            );
          })
        }
      </Geographies>
    </ComposableMap>
  );
}

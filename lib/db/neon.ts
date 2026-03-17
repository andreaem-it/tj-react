import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL non impostata. Configura Neon in .env.local");
}

export const sql = neon(process.env.DATABASE_URL);


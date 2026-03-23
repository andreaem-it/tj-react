import { neon } from "@neondatabase/serverless";

type SqlClient = ReturnType<typeof neon>;

let client: SqlClient | undefined;

function getClient(): SqlClient {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL non impostata. Configura Neon in .env.local");
    }
    client = neon(url);
  }
  return client;
}

/** Tag template Neon: client creato alla prima query. */
export const sql = ((strings: TemplateStringsArray, ...values: unknown[]) => {
  return getClient()(strings, ...values);
}) as SqlClient;

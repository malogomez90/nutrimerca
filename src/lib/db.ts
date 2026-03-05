import { Pool, type QueryResultRow } from "pg";

declare global {
  var __nutrimercaPgPool: Pool | undefined;
  var __nutrimercaSchemaReady: Promise<void> | undefined;
}

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no configurado");
  }

  if (!global.__nutrimercaPgPool) {
    global.__nutrimercaPgPool = new Pool({ connectionString });
  }

  return global.__nutrimercaPgPool;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  const pool = getPool();
  return pool.query<T>(text, params);
}

export async function ensureCoreSchema() {
  if (!isDatabaseConfigured()) return;

  if (!global.__nutrimercaSchemaReady) {
    global.__nutrimercaSchemaReady = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(128) UNIQUE NOT NULL,
          email TEXT,
          stripe_customer_id TEXT UNIQUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          stripe_subscription_id TEXT UNIQUE,
          plan VARCHAR(32) NOT NULL DEFAULT 'free',
          status VARCHAR(32) NOT NULL DEFAULT 'free',
          current_period_end TIMESTAMPTZ,
          cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS billing_events (
          event_id TEXT PRIMARY KEY,
          event_type TEXT NOT NULL,
          processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS demo_quota (
          session_id VARCHAR(128) PRIMARY KEY,
          used_messages INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS message_quota_monthly (
          session_id VARCHAR(128) NOT NULL,
          month_key CHAR(7) NOT NULL,
          used_messages INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (session_id, month_key)
        );
      `);
    })();
  }

  await global.__nutrimercaSchemaReady;
}

import { Pool, type PoolConfig } from "pg";

export type QueryParams = readonly unknown[];

export interface QueryResultLike<T = Record<string, unknown>> {
  rows: T[];
}

export interface Queryable {
  query<T = Record<string, unknown>>(
    text: string,
    params?: QueryParams
  ): Promise<QueryResultLike<T>>;
}

export interface TransactionClient extends Queryable {
  release(): void;
}

export interface TransactionalQueryable extends Queryable {
  connect(): Promise<TransactionClient>;
}

export type DatabaseClient = Queryable | TransactionalQueryable;

export function createDataPool(config: PoolConfig | string): Pool {
  return typeof config === "string"
    ? new Pool({ connectionString: config })
    : new Pool(config);
}

export async function withTransaction<T>(
  db: DatabaseClient,
  callback: (client: Queryable) => Promise<T>
): Promise<T> {
  if (!hasConnect(db)) {
    await db.query("BEGIN");
    try {
      const result = await callback(db);
      await db.query("COMMIT");
      return result;
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function hasConnect(db: DatabaseClient): db is TransactionalQueryable {
  return "connect" in db && typeof db.connect === "function";
}

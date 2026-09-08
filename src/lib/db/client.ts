import { neon } from '@neondatabase/serverless';
import { initDatabaseSchema } from '../../../scripts/init-db.js';

const DATABASE_URL = process.env.DATABASE_URL;

function adaptQuery(query: string): string {
  let index = 1;
  return query
    .replace(/strftime\('%Y-%m',\s*([^)]+)\)/g, "to_char($1, 'YYYY-MM')")
    .replace(/\?/g, () => `$${index++}`);
}

class NeonDbClient {
  private sql = neon(DATABASE_URL!);
  private schemaChecked = false;

  private async ensureSchema() {
    if (!this.schemaChecked) {
      this.schemaChecked = true;
      try {
        await initDatabaseSchema();
      } catch (err) {
        console.error('Schema check warning:', err);
      }
    }
  }

  async all<T = any>(query: string, ...params: any[]): Promise<T[]> {
    await this.ensureSchema();
    const adapted = adaptQuery(query);
    const flatParams = params.flat();
    const rows = await this.sql.query(adapted, flatParams);
    return rows as unknown as T[];
  }

  async get<T = any>(query: string, ...params: any[]): Promise<T | undefined> {
    const rows = await this.all<T>(query, ...params);
    return rows[0];
  }

  async run(query: string, ...params: any[]): Promise<{ changes: number }> {
    await this.ensureSchema();
    const adapted = adaptQuery(query);
    const flatParams = params.flat();
    const rows = await this.sql.query(adapted, flatParams);
    return { changes: Array.isArray(rows) ? rows.length : 1 };
  }

  prepare(query: string) {
    return {
      all: (...params: any[]) => this.all(query, ...params),
      get: (...params: any[]) => this.get(query, ...params),
      run: (...params: any[]) => this.run(query, ...params),
    };
  }

  transaction(fn: () => Promise<void> | void) {
    return async () => {
      await fn();
    };
  }
}

export const db = new NeonDbClient();

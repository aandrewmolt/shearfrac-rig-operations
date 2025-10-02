import { createClient } from '@libsql/client/web';

// Lazy initialization to avoid environment variable issues
let tursoClient: ReturnType<typeof createClient> | null = null;

/**
 * Helper function to convert row arrays to objects using column names
 * libSQL returns rows as arrays: ["val1", "val2", ...]
 * We need to convert them to objects: {col1: "val1", col2: "val2", ...}
 */
function convertRowsToObjects(result: { rows: unknown[][]; columns: string[]; [key: string]: unknown }) {
  if (!result.rows || !result.columns) {
    return result;
  }

  const objectRows = result.rows.map(row => {
    const obj: Record<string, unknown> = {};
    result.columns.forEach((column, index) => {
      obj[column] = row[index];
    });
    return obj;
  });

  return {
    ...result,
    rows: objectRows
  };
}

// Proxy client for production (uses API endpoint to avoid CORS)
class ProxyTursoClient {
  private apiUrl: string;

  constructor() {
    this.apiUrl = '/api/db-proxy';
  }

  async execute(sqlOrObj: string | { sql: string; args?: unknown[] }, params?: unknown[]) {
    // Handle both string and object formats
    const sql = typeof sqlOrObj === 'string' ? sqlOrObj : sqlOrObj.sql;
    const args = typeof sqlOrObj === 'string' ? params : sqlOrObj.args;

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation: 'execute', sql, params: args })
    });

    if (!response.ok) {
      throw new Error(`Database proxy error: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error);
    }

    // Backend db-proxy already converts rows to objects, so just return the data
    return result.data;
  }

  async batch(statements: { sql: string; params?: unknown[] }[]) {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation: 'batch', statements })
    });

    if (!response.ok) {
      throw new Error(`Database proxy error: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error);
    }

    // Backend db-proxy already converts rows to objects, so just return the data
    return result.data;
  }
}

// Mock client for local development without a Turso database
class MockTursoClient {
  private storage: Map<string, unknown[]> = new Map();

  async execute(sqlOrObj: string | { sql: string; args?: unknown[] }, params?: unknown[]) {
    // Handle both string and object formats
    const sql = typeof sqlOrObj === 'string' ? sqlOrObj : sqlOrObj.sql;
    const args = typeof sqlOrObj === 'string' ? params : sqlOrObj.args;

    // Simple mock implementation for basic queries
    const upperSql = sql.toUpperCase();

    if (upperSql.includes('SELECT 1')) {
      return { rows: [{ '1': 1 }], columns: ['1'] };
    }

    if (upperSql.includes('CREATE TABLE')) {
      return { rows: [], columns: [] };
    }

    if (upperSql.includes('SELECT') && upperSql.includes('FROM')) {
      const tableMatch = sql.match(/FROM\s+(\w+)/i);
      const tableName = tableMatch ? tableMatch[1] : '';
      const rows = this.storage.get(tableName) || [];
      return { rows, columns: rows.length > 0 ? Object.keys(rows[0]) : [] };
    }

    if (upperSql.includes('INSERT INTO')) {
      const tableMatch = sql.match(/INSERT INTO\s+(\w+)/i);
      const tableName = tableMatch ? tableMatch[1] : '';
      if (!this.storage.has(tableName)) {
        this.storage.set(tableName, []);
      }
      const tableData = this.storage.get(tableName)!;
      tableData.push({ id: Date.now().toString(), ...args });
      return { rows: [], columns: [] };
    }

    return { rows: [], columns: [] };
  }

  async batch(statements: { sql: string; params?: unknown[] }[]) {
    const results = [];
    for (const stmt of statements) {
      results.push(await this.execute(stmt.sql, stmt.params));
    }
    return results;
  }
}

export function getTursoClient() {
  if (!tursoClient) {
    const dbUrl = import.meta.env.VITE_TURSO_DATABASE_URL;
    const isProduction = import.meta.env.PROD;

    // If no URL provided, use mock client for local development
    if (!dbUrl || dbUrl === '' || dbUrl.startsWith('file:')) {
      console.warn('⚠️ No Turso database URL provided. Using in-memory mock database for development.');
      console.log('ℹ️ To use a real database, sign up at https://turso.tech and add credentials to .env');
      tursoClient = new MockTursoClient() as unknown as typeof tursoClient;
    } else if (isProduction) {
      // In production, use proxy to avoid CORS
      console.log('🔄 Using database proxy for Turso connection (avoids CORS)');
      tursoClient = new ProxyTursoClient() as unknown as typeof tursoClient;
    } else {
      // In development, connect directly
      tursoClient = createClient({
        url: dbUrl,
        authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN,
      });
    }
  }
  return tursoClient;
}

// Export using Proxy for lazy initialization to avoid module initialization issues
export const turso = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    const client = getTursoClient();
    const value = (client as Record<string, unknown>)[prop as string];
    // If it's a function, bind it to the client to maintain correct 'this' context
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

// Test connection
export async function testConnection() {
  try {
    const client = getTursoClient();
    await client.execute('SELECT 1');
    console.log('✅ Turso database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Turso database connection failed:', error);
    return false;
  }
}
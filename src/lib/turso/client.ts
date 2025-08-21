import { createClient } from '@libsql/client/web';

// Lazy initialization to avoid environment variable issues
let tursoClient: ReturnType<typeof createClient> | null = null;

export function getTursoClient() {
  if (!tursoClient) {
    // Check if we have a Turso database URL
    if (!import.meta.env.VITE_TURSO_DATABASE_URL) {
      throw new Error(
        'VITE_TURSO_DATABASE_URL is required. Please set up a Turso database at https://turso.tech and add your credentials to .env'
      );
    }

    // Create Turso client for production use
    tursoClient = createClient({
      url: import.meta.env.VITE_TURSO_DATABASE_URL,
      authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN,
    });
  }
  return tursoClient;
}

// Export using Proxy for lazy initialization to avoid module initialization issues
export const turso = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    const client = getTursoClient();
    const value = (client as any)[prop];
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
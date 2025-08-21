// Database configuration - Using Turso for all modes
// Turso provides both local file mode and cloud sync
export const DATABASE_MODE = 'turso';

// Lazy-loaded configuration to avoid accessing env vars at module level
let _databaseConfig: any = null;

export const getDatabaseConfig = () => {
  if (!_databaseConfig) {
    _databaseConfig = {
      mode: DATABASE_MODE,
      
      // Turso config
      turso: {
        available: true,
        get url() {
          return import.meta.env?.VITE_TURSO_DATABASE_URL || 'file:local.db';
        },
      },
      
      // Feature flags
      features: {
        realtime: true, // Turso supports real-time sync
        fileStorage: true, // Using Vercel Blob for file storage
        authentication: true, // Using Turso for auth
        cloudSync: true, // Turso syncs automatically
      }
    };
  }
  return _databaseConfig;
};

// Export for backward compatibility
export const databaseConfig = new Proxy({} as any, {
  get(target, prop) {
    const config = getDatabaseConfig();
    return config[prop];
  }
});

// Helper to check if we're in offline mode
export const isOfflineMode = () => {
  const url = import.meta.env?.VITE_TURSO_DATABASE_URL;
  return !url || url.includes('file:');
};

// Helper to check if we have cloud features
export const hasCloudFeatures = () => {
  const url = import.meta.env?.VITE_TURSO_DATABASE_URL;
  return url && !url.includes('file:');
};
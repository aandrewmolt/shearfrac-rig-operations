/**
 * Centralized environment configuration
 * This file handles all environment variables and provides type-safe access
 */

// Helper to get environment variable with fallback
function getEnvVar(key: string, fallback?: string): string {
  if (typeof window !== 'undefined') {
    // Browser environment - use import.meta.env for Vite
    const value = (import.meta as any).env?.[key] || 
                  (window as any).__ENV__?.[key] || 
                  fallback;
    return value || '';
  } else {
    // Node.js environment
    return process.env[key] || fallback || '';
  }
}

// Helper to check if we're in development
function isDevelopment(): boolean {
  const env = getEnvVar('NODE_ENV', 'production');
  return env === 'development' || env === 'dev';
}

// Helper to check if we're in production
function isProduction(): boolean {
  const env = getEnvVar('NODE_ENV', 'production');
  return env === 'production' || env === 'prod';
}

export const config = {
  // Environment
  env: {
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    isTest: getEnvVar('NODE_ENV') === 'test',
    nodeEnv: getEnvVar('NODE_ENV', 'production'),
  },

  // Turso Database Configuration
  turso: {
    databaseUrl: getEnvVar('VITE_TURSO_DATABASE_URL') || 
                 getEnvVar('TURSO_DATABASE_URL') || 
                 'file:local.db',
    authToken: getEnvVar('VITE_TURSO_AUTH_TOKEN') || 
               getEnvVar('TURSO_AUTH_TOKEN') || 
               '',
    // Check if Turso is properly configured
    isConfigured: () => {
      const url = config.turso.databaseUrl;
      const token = config.turso.authToken;
      return !!(url && url !== 'file:local.db' && token);
    },
  },

  // API Configuration
  api: {
    baseUrl: getEnvVar('VITE_API_URL', '/api'),
    timeout: parseInt(getEnvVar('VITE_API_TIMEOUT', '30000'), 10),
    retryAttempts: parseInt(getEnvVar('VITE_API_RETRY_ATTEMPTS', '3'), 10),
  },

  // Feature Flags
  features: {
    enableSync: getEnvVar('VITE_ENABLE_SYNC', 'true') === 'true',
    enableOfflineMode: getEnvVar('VITE_ENABLE_OFFLINE', 'true') === 'true',
    enableDebugPanel: getEnvVar('VITE_ENABLE_DEBUG', 'false') === 'true',
    enableAnalytics: getEnvVar('VITE_ENABLE_ANALYTICS', 'false') === 'true',
    enableErrorReporting: getEnvVar('VITE_ENABLE_ERROR_REPORTING', 'true') === 'true',
  },

  // Storage Configuration
  storage: {
    prefix: getEnvVar('VITE_STORAGE_PREFIX', 'shearwater_'),
    encryptionKey: getEnvVar('VITE_STORAGE_ENCRYPTION_KEY', ''),
    // Storage quota in MB
    quota: parseInt(getEnvVar('VITE_STORAGE_QUOTA', '50'), 10),
  },

  // Authentication (if needed in future)
  auth: {
    enabled: getEnvVar('VITE_AUTH_ENABLED', 'false') === 'true',
    provider: getEnvVar('VITE_AUTH_PROVIDER', 'none'),
    clientId: getEnvVar('VITE_AUTH_CLIENT_ID', ''),
  },

  // Logging Configuration
  logging: {
    level: getEnvVar('VITE_LOG_LEVEL', isDevelopment() ? 'debug' : 'error'),
    enableConsole: getEnvVar('VITE_LOG_CONSOLE', 'true') === 'true',
    enableRemote: getEnvVar('VITE_LOG_REMOTE', 'false') === 'true',
    remoteUrl: getEnvVar('VITE_LOG_REMOTE_URL', ''),
  },

  // Performance Configuration
  performance: {
    // Debounce delay in ms for saves
    saveDebounceMs: parseInt(getEnvVar('VITE_SAVE_DEBOUNCE', '1000'), 10),
    // Batch size for bulk operations
    batchSize: parseInt(getEnvVar('VITE_BATCH_SIZE', '50'), 10),
    // Cache TTL in seconds
    cacheTtl: parseInt(getEnvVar('VITE_CACHE_TTL', '300'), 10),
  },

  // UI Configuration
  ui: {
    theme: getEnvVar('VITE_UI_THEME', 'dark') as 'light' | 'dark' | 'system',
    compactMode: getEnvVar('VITE_UI_COMPACT', 'false') === 'true',
    animations: getEnvVar('VITE_UI_ANIMATIONS', 'true') === 'true',
  },
};

// Validation function to check critical configuration
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check Turso configuration
  if (!config.turso.isConfigured()) {
    errors.push('Turso database is not properly configured. Please set VITE_TURSO_DATABASE_URL and VITE_TURSO_AUTH_TOKEN.');
  }

  // Check API configuration
  if (!config.api.baseUrl) {
    errors.push('API base URL is not configured.');
  }

  // Add more validation as needed

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export helper to get all config as JSON (useful for debugging)
export function getConfigJson(): string {
  // Mask sensitive values
  const safeConfig = {
    ...config,
    turso: {
      ...config.turso,
      authToken: config.turso.authToken ? '***MASKED***' : '',
    },
    storage: {
      ...config.storage,
      encryptionKey: config.storage.encryptionKey ? '***MASKED***' : '',
    },
    auth: {
      ...config.auth,
      clientId: config.auth.clientId ? '***MASKED***' : '',
    },
  };
  
  return JSON.stringify(safeConfig, null, 2);
}

// Log configuration in development
if (config.env.isDevelopment && config.logging.enableConsole) {
  console.log('Environment Configuration:', getConfigJson());
  const validation = validateConfig();
  if (!validation.valid) {
    console.warn('Configuration validation errors:', validation.errors);
  }
}
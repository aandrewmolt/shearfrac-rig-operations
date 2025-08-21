import { StorageAdapter } from './storage.interface';
import { GitHubStorageAdapter } from './githubStorage';
import { AWSStorageAdapter } from './awsStorage';

export type StorageProvider = 'github' | 'aws' | 'local';

/**
 * Factory for creating storage adapters
 * This makes it easy to switch between different storage providers
 */
export class StorageFactory {
  static create(provider: StorageProvider = 'github'): StorageAdapter {
    switch (provider) {
      case 'aws':
        // Uncomment this when AWS is configured
        // return new AWSStorageAdapter();
        console.warn('AWS storage not configured, falling back to GitHub storage');
        return new GitHubStorageAdapter();
        
      case 'github':
      case 'local':
      default:
        return new GitHubStorageAdapter();
    }
  }
}

// Environment variable or config to determine which storage to use
export const STORAGE_PROVIDER: StorageProvider = 
  (import.meta.env.VITE_CONTACTS_STORAGE as StorageProvider) || 'github';
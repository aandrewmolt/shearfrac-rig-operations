import { StorageAdapter } from './storage.interface';
import { Contact, ContactsDatabase } from '../types';
import { defaultClientColumns, defaultFracColumns, defaultCustomColumns } from '../utils/columnConfig';
import { migrateColumnSettings } from '../utils/columnMigration';
import { toast } from 'sonner';

const STORAGE_KEY = 'shearfrac_contacts_db';
const DB_VERSION = '1.0.0';

// GitHub configuration from environment variables
const GITHUB_OWNER = import.meta.env.VITE_GITHUB_OWNER;
const GITHUB_REPO = import.meta.env.VITE_GITHUB_REPO;
const GITHUB_PATH = import.meta.env.VITE_GITHUB_PATH || 'data/contacts.json';
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const GITHUB_BRANCH = import.meta.env.VITE_GITHUB_BRANCH || 'main';

export class GitHubStorageAdapter implements StorageAdapter {
  private data: ContactsDatabase | null = null;
  private githubSha: string | null = null;
  private isGitHubEnabled: boolean;

  constructor() {
    // Check if GitHub storage is properly configured
    this.isGitHubEnabled = !!(GITHUB_OWNER && GITHUB_REPO && GITHUB_TOKEN);
    
    if (!this.isGitHubEnabled) {
      console.warn('⚠️ GitHub storage not configured. Contacts will only be saved locally!');
      console.warn('Missing environment variables:', {
        GITHUB_OWNER: !!GITHUB_OWNER,
        GITHUB_REPO: !!GITHUB_REPO,
        GITHUB_TOKEN: !!GITHUB_TOKEN
      });
      console.log('To enable GitHub storage, set VITE_GITHUB_OWNER, VITE_GITHUB_REPO, and VITE_GITHUB_TOKEN in Vercel');
      
      // Show warning to user
      setTimeout(() => {
        toast.warning('Contacts are only saved locally!', {
          description: 'GitHub storage is not configured. Contacts will not persist across devices.',
          duration: 8000
        });
      }, 1000);
    } else {
      console.log('✅ GitHub storage configured:', {
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: GITHUB_PATH,
        tokenLength: GITHUB_TOKEN?.length || 0
      });
    }
  }

  private getDefaultDatabase(): ContactsDatabase {
    return {
      version: DB_VERSION,
      lastModified: new Date().toISOString(),
      contacts: [],
      customTypes: ['Coldbore'],
      columnSettings: {
        client: defaultClientColumns,
        frac: defaultFracColumns,
        custom: defaultCustomColumns,
      },
    };
  }

  private async fetchFromGitHub(): Promise<{ content: string; sha: string } | null> {
    if (!this.isGitHubEnabled) return null;

    try {
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${GITHUB_TOKEN}`,
      };

      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}?ref=${GITHUB_BRANCH}`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        const content = atob(data.content.replace(/\n/g, '')); // Decode base64
        return { content, sha: data.sha };
      } else if (response.status === 404) {
        console.log('GitHub file not found, will create new one');
        return null;
      } else {
        const errorText = await response.text();
        console.error(`GitHub API error ${response.status}:`, errorText);
        
        if (response.status === 401) {
          console.error('🔐 GitHub Authentication Failed!');
          console.error('Please check your GitHub token in Vercel environment variables');
          console.error('Token should start with "ghp_" or "github_pat_"');
          console.error('Make sure the token has "repo" permissions');
          
          toast.error('GitHub authentication failed! Contacts will only be saved locally.', {
            description: 'Please check your GitHub token configuration.',
            duration: 10000
          });
        }
        
        return null;
      }
    } catch (error) {
      console.error('Error fetching from GitHub:', error);
      return null;
    }
  }

  async load(): Promise<ContactsDatabase> {
    try {
      // Try GitHub first if enabled
      if (this.isGitHubEnabled) {
        const githubData = await this.fetchFromGitHub();
        
        if (githubData) {
          this.data = JSON.parse(githubData.content);
          this.githubSha = githubData.sha;
          
          // Apply migrations
          this.data = this.applyMigrations(this.data);
          
          // Cache in localStorage for offline access
          const migratedContent = JSON.stringify(this.data);
          localStorage.setItem(STORAGE_KEY, migratedContent);
          localStorage.setItem(STORAGE_KEY + '_sha', githubData.sha);
          
          console.log('Loaded contacts from GitHub');
          return this.data!;
        }
      }
      
      // Fall back to localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.data = JSON.parse(stored);
        this.githubSha = localStorage.getItem(STORAGE_KEY + '_sha');
        
        // Apply migrations
        this.data = this.applyMigrations(this.data);
        
        console.log('Loaded contacts from local storage');
        return this.data!;
      }
    } catch (error) {
      console.error('Error loading contacts database:', error);
    }

    // Return default database if nothing is stored
    console.log('Creating new contacts database');
    this.data = this.getDefaultDatabase();
    await this.save(this.data);
    return this.data;
  }

  async save(data: ContactsDatabase): Promise<void> {
    try {
      data.lastModified = new Date().toISOString();
      this.data = data;
      const jsonContent = JSON.stringify(data, null, 2);
      
      // Always save to localStorage first (for offline access)
      localStorage.setItem(STORAGE_KEY, jsonContent);
      
      // Save to GitHub if enabled
      if (this.isGitHubEnabled) {
        await this.saveToGitHub(jsonContent);
      }
    } catch (error) {
      console.error('Error saving contacts database:', error);
      // Don't throw - localStorage save succeeded
    }
  }

  private async saveToGitHub(jsonContent: string): Promise<void> {
    try {
      const message = `Update contacts database - ${new Date().toLocaleString()}`;
      const contentBase64 = btoa(unescape(encodeURIComponent(jsonContent)));
      
      const body: any = {
        message,
        content: contentBase64,
        branch: GITHUB_BRANCH,
      };
      
      // Include SHA if updating existing file
      if (this.githubSha) {
        body.sha = this.githubSha;
      }
      
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`,
        {
          method: 'PUT',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        this.githubSha = result.content.sha;
        localStorage.setItem(STORAGE_KEY + '_sha', this.githubSha);
        console.log('Successfully saved to GitHub');
      } else {
        const errorText = await response.text();
        console.error('GitHub save failed:', response.status, errorText);
        
        // If it's a conflict, try to fetch latest and retry once
        if (response.status === 409) {
          console.log('Conflict detected, fetching latest version...');
          const latest = await this.fetchFromGitHub();
          if (latest) {
            this.githubSha = latest.sha;
            // Retry save with new SHA
            body.sha = this.githubSha;
            const retryResponse = await fetch(
              `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`,
              {
                method: 'PUT',
                headers: {
                  'Accept': 'application/vnd.github.v3+json',
                  'Authorization': `token ${GITHUB_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
              }
            );
            
            if (retryResponse.ok) {
              const retryResult = await retryResponse.json();
              this.githubSha = retryResult.content.sha;
              localStorage.setItem(STORAGE_KEY + '_sha', this.githubSha);
              console.log('Successfully saved to GitHub after retry');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error saving to GitHub:', error);
    }
  }

  async getContact(id: string): Promise<Contact | null> {
    if (!this.data) {
      await this.load();
    }
    return this.data!.contacts.find(c => c.id === id) || null;
  }

  async updateContact(id: string, contact: Contact): Promise<void> {
    if (!this.data) {
      await this.load();
    }
    
    const index = this.data!.contacts.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error(`Contact with id ${id} not found`);
    }
    
    this.data!.contacts[index] = contact;
    await this.save(this.data!);
  }

  async deleteContact(id: string): Promise<void> {
    if (!this.data) {
      await this.load();
    }
    
    this.data!.contacts = this.data!.contacts.filter(c => c.id !== id);
    await this.save(this.data!);
  }

  async addContact(contact: Contact): Promise<void> {
    if (!this.data) {
      await this.load();
    }
    
    this.data!.contacts.push(contact);
    
    // If it's a custom type (not client or frac), add it to customTypes
    if (contact.type !== 'client' && contact.type !== 'frac' && !this.data!.customTypes.includes(contact.type)) {
      this.data!.customTypes.push(contact.type);
    }
    
    await this.save(this.data!);
  }

  private applyMigrations(data: ContactsDatabase): ContactsDatabase {
    // Migrate column settings to remove phoneNumber columns
    const migratedColumnSettings = { ...data.columnSettings };
    
    for (const type in migratedColumnSettings) {
      migratedColumnSettings[type] = migrateColumnSettings(migratedColumnSettings[type]);
    }
    
    // Migrate contacts data - convert phoneNumber to phone for client contacts
    const migratedContacts = data.contacts.map(contact => {
      if (contact.type === 'client' && 'phoneNumber' in contact) {
        const { phoneNumber, ...rest } = contact as any;
        return {
          ...rest,
          phone: phoneNumber || (contact as any).phone || '',
        };
      }
      return contact;
    });
    
    return {
      ...data,
      contacts: migratedContacts,
      columnSettings: migratedColumnSettings,
    };
  }
}
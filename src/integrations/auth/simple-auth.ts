// Simple authentication for MVP - replace with proper auth later

interface User {
  id: string;
  email: string;
  name?: string;
}

class SimpleAuth {
  private currentUser: User | null = null;
  private readonly STORAGE_KEY = 'rigup_auth_user';
  private initialized = false;

  private initialize() {
    if (this.initialized) return;
    this.initialized = true;
    
    // Only access localStorage if it's available (client-side)
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        try {
          this.currentUser = JSON.parse(stored);
        } catch {
          this.currentUser = null;
        }
      }
    }
  }

  // Simple login - stores user in Turso
  async signIn(email: string, password: string): Promise<User> {
    this.initialize();
    // For MVP, accept any email/password
    // In production, this would validate against a real auth service
    
    // Lazy load tursoDb to avoid module-level import
    const { tursoDb } = await import('@/services/tursoDb');
    
    // Check if user exists in Turso
    let user = await tursoDb.getUser(email);
    
    if (!user) {
      // Create new user in Turso
      user = await tursoDb.createUser(email, email.split('@')[0]);
    }
    
    this.currentUser = user as User;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    }
    
    return user as User;
  }

  // Sign out
  async signOut(): Promise<void> {
    this.initialize();
    this.currentUser = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  // Get current user
  getUser(): User | null {
    this.initialize();
    // Always return a user for non-Supabase modes
    if (!this.currentUser) {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          try {
            this.currentUser = JSON.parse(stored);
          } catch {
            // Create default user
            this.currentUser = {
              id: 'local-user',
              email: 'user@rigup.com',
              name: 'RigUp User'
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentUser));
          }
        } else {
          // Create default user
          this.currentUser = {
            id: 'local-user',
            email: 'user@rigup.com',
            name: 'RigUp User'
          };
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentUser));
        }
      } else {
        // Return default user if no localStorage
        this.currentUser = {
          id: 'local-user',
          email: 'user@rigup.com',
          name: 'RigUp User'
        };
      }
    }
    return this.currentUser;
  }

  // Check if authenticated
  isAuthenticated(): boolean {
    this.initialize();
    return this.currentUser !== null;
  }

  // Mock session for compatibility
  getSession() {
    this.initialize();
    return this.currentUser ? { user: this.currentUser } : null;
  }
}

// Lazy-loaded singleton instance
let _simpleAuth: SimpleAuth | null = null;

export const getSimpleAuth = (): SimpleAuth => {
  if (!_simpleAuth) {
    _simpleAuth = new SimpleAuth();
  }
  return _simpleAuth;
};

// Export for backward compatibility (will be lazy-loaded on first access)
export const simpleAuth = new Proxy({} as SimpleAuth, {
  get(target, prop) {
    const auth = getSimpleAuth();
    return (auth as any)[prop];
  }
});
// Save lock mechanism to prevent concurrent save operations
class SaveLock {
  private locks: Map<string, boolean> = new Map();
  private lockTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  /**
   * Acquire a lock for a specific resource
   * Returns true if lock was acquired, false if resource is already locked
   */
  acquire(resourceId: string, timeoutMs: number = 5000): boolean {
    if (this.locks.get(resourceId)) {
      console.log(`Save lock denied for ${resourceId} - already in progress`);
      return false;
    }
    
    this.locks.set(resourceId, true);
    
    // Auto-release lock after timeout to prevent deadlocks
    const timeout = setTimeout(() => {
      this.release(resourceId);
      console.warn(`Save lock auto-released for ${resourceId} after timeout`);
    }, timeoutMs);
    
    this.lockTimeouts.set(resourceId, timeout);
    console.log(`Save lock acquired for ${resourceId}`);
    return true;
  }
  
  /**
   * Release a lock for a specific resource
   */
  release(resourceId: string): void {
    this.locks.delete(resourceId);
    
    const timeout = this.lockTimeouts.get(resourceId);
    if (timeout) {
      clearTimeout(timeout);
      this.lockTimeouts.delete(resourceId);
    }
    
    console.log(`Save lock released for ${resourceId}`);
  }
  
  /**
   * Check if a resource is currently locked
   */
  isLocked(resourceId: string): boolean {
    return this.locks.get(resourceId) || false;
  }
  
  /**
   * Execute a function with lock protection
   */
  async withLock<T>(
    resourceId: string, 
    fn: () => Promise<T>,
    timeoutMs: number = 5000
  ): Promise<T | null> {
    if (!this.acquire(resourceId, timeoutMs)) {
      return null;
    }
    
    try {
      const result = await fn();
      return result;
    } finally {
      this.release(resourceId);
    }
  }
}

// Lazy-loaded singleton instance
let _saveLock: SaveLock | null = null;

export const getSaveLock = (): SaveLock => {
  if (!_saveLock) {
    _saveLock = new SaveLock();
  }
  return _saveLock;
};

// Export for backward compatibility (will be lazy-loaded on first access)
export const saveLock = new Proxy({} as SaveLock, {
  get(target, prop) {
    const lock = getSaveLock();
    return (lock as Record<string, unknown>)[prop as string];
  }
});
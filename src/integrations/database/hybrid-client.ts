import { v4 as uuidv4 } from 'uuid';

// Hybrid database client that uses IndexedDB as primary storage
// and syncs with Vercel Blob when available
export class HybridDatabaseClient {
  private syncInterval: NodeJS.Timeout | null = null;
  private syncInProgress = false;
  private initialized = false;
  private offlineDb: any = null;
  private blobStorage: any = null;
  
  private async initialize() {
    if (this.initialized) return;
    this.initialized = true;
    
    // Lazy load dependencies
    const [{ offlineDb }, { blobStorage }, { DATABASE_MODE }] = await Promise.all([
      import('@/lib/offline/offlineDatabase'),
      import('@/integrations/blob/client'),
      import('@/config/database.config')
    ]);
    
    this.offlineDb = offlineDb;
    this.blobStorage = blobStorage;
    
    // Start sync if in vercel-blob mode
    if (DATABASE_MODE === 'vercel-blob') {
      this.startAutoSync();
    }
  }
  
  private async getOfflineDb() {
    if (!this.offlineDb) {
      await this.initialize();
    }
    return this.offlineDb;
  }
  
  private async getBlobStorage() {
    if (!this.blobStorage) {
      await this.initialize();
    }
    return this.blobStorage;
  }

  // Start auto-sync every 2 minutes (increased from 30 seconds to reduce conflicts)
  private startAutoSync() {
    this.syncInterval = setInterval(() => {
      this.syncToCloud();
    }, 120000); // 2 minutes
  }

  // Stop auto-sync
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Sync local data to cloud
  async syncToCloud() {
    await this.initialize();
    const { DATABASE_MODE } = await import('@/config/database.config');
    if (this.syncInProgress || DATABASE_MODE !== 'vercel-blob') return;
    
    this.syncInProgress = true;
    try {
      console.log('Syncing to Vercel Blob...');
      
      const offlineDb = await this.getOfflineDb();
      const blobStorage = await this.getBlobStorage();
      
      // Sync equipment types
      const equipmentTypes = await offlineDb.equipment_types.toArray();
      await blobStorage.setEquipmentTypes(equipmentTypes);
      
      // Sync storage locations
      const storageLocations = await offlineDb.storage_locations.toArray();
      await blobStorage.setStorageLocations(storageLocations);
      
      // Sync jobs
      const jobs = await offlineDb.jobs.toArray();
      await blobStorage.setJobs(jobs);
      
      // Update last sync time
      await blobStorage.setLastSync(new Date());
      
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync from cloud to local
  async syncFromCloud() {
    await this.initialize();
    const { DATABASE_MODE } = await import('@/config/database.config');
    if (DATABASE_MODE !== 'vercel-blob') return;
    
    try {
      console.log('Syncing from Vercel Blob...');
      
      const offlineDb = await this.getOfflineDb();
      const blobStorage = await this.getBlobStorage();
      
      // Get data from Blob
      const equipmentTypes = await blobStorage.getEquipmentTypes();
      const storageLocations = await blobStorage.getStorageLocations();
      const jobs = await blobStorage.getAllJobs();
      
      // Update local database
      if (equipmentTypes.length > 0) {
        await offlineDb.equipment_types.clear();
        await offlineDb.equipment_types.bulkAdd(equipmentTypes);
      }
      
      if (storageLocations.length > 0) {
        await offlineDb.storage_locations.clear();
        await offlineDb.storage_locations.bulkAdd(storageLocations);
      }
      
      if (jobs.length > 0) {
        // Deduplicate jobs by name before syncing
        const uniqueJobs = new Map();
        jobs.forEach(job => {
          const existing = uniqueJobs.get(job.name);
          if (!existing || (job.updated_at && existing.updated_at && job.updated_at > existing.updated_at)) {
            uniqueJobs.set(job.name, job);
          }
        });
        
        await offlineDb.jobs.clear();
        await offlineDb.jobs.bulkAdd(Array.from(uniqueJobs.values()));
      }
      
      console.log('Sync from cloud completed');
    } catch (error) {
      console.error('Sync from cloud error:', error);
    }
  }

  // Equipment Types
  async getEquipmentTypes() {
    const offlineDb = await this.getOfflineDb();
    return await offlineDb.equipment_types.toArray();
  }

  async createEquipmentType(type: any) {
    const newType = {
      ...type,
      id: type.id || uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const offlineDb = await this.getOfflineDb();
    await offlineDb.equipment_types.add(newType);
    this.syncToCloud(); // Async sync
    return newType;
  }

  async updateEquipmentType(id: string, updates: any) {
    const updated = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    const offlineDb = await this.getOfflineDb();
    await offlineDb.equipment_types.update(id, updated);
    this.syncToCloud(); // Async sync
    return await offlineDb.equipment_types.get(id);
  }

  async deleteEquipmentType(id: string) {
    const offlineDb = await this.getOfflineDb();
    await offlineDb.equipment_types.delete(id);
    this.syncToCloud(); // Async sync
  }

  // Storage Locations
  async getStorageLocations() {
    const offlineDb = await this.getOfflineDb();
    return await offlineDb.storage_locations.toArray();
  }

  async createStorageLocation(location: any) {
    const newLocation = {
      ...location,
      id: location.id || uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const offlineDb = await this.getOfflineDb();
    await offlineDb.storage_locations.add(newLocation);
    this.syncToCloud(); // Async sync
    return newLocation;
  }

  async updateStorageLocation(id: string, updates: any) {
    const updated = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    const offlineDb = await this.getOfflineDb();
    await offlineDb.storage_locations.update(id, updated);
    this.syncToCloud(); // Async sync
    return await offlineDb.storage_locations.get(id);
  }

  async deleteStorageLocation(id: string) {
    const offlineDb = await this.getOfflineDb();
    await offlineDb.storage_locations.delete(id);
    this.syncToCloud(); // Async sync
  }

  // Jobs
  async getJobs() {
    const offlineDb = await this.getOfflineDb();
    return await offlineDb.jobs.toArray();
  }

  async createJob(job: any) {
    const offlineDb = await this.getOfflineDb();
    
    // Check for existing job with same name to prevent duplicates
    const existingJobs = await offlineDb.jobs.toArray();
    const duplicateJob = existingJobs.find(j => 
      j.name === job.name && j.id !== job.id
    );
    
    if (duplicateJob) {
      console.log('Found duplicate job with same name, updating instead of creating:', job.name);
      return await this.updateJob(duplicateJob.id, job);
    }
    
    const newJob = {
      ...job,
      id: job.id || uuidv4(),
      cloudId: job.id || uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: Date.now(),
      syncStatus: 'pending' as const
    };
    
    await offlineDb.jobs.add(newJob);
    this.syncToCloud(); // Async sync
    return newJob;
  }

  async updateJob(id: string, updates: any) {
    const updated = {
      ...updates,
      updated_at: Date.now(),
      syncStatus: 'pending' as const
    };
    
    const offlineDb = await this.getOfflineDb();
    
    // Update by either id or cloudId
    const existingJob = await offlineDb.jobs
      .where('id').equals(id)
      .or('cloudId').equals(id)
      .first();
      
    if (existingJob) {
      await offlineDb.jobs.update(existingJob.id, updated);
    }
    
    this.syncToCloud(); // Async sync
    return await offlineDb.jobs.get(existingJob?.id || id);
  }

  async deleteJob(id: string) {
    const offlineDb = await this.getOfflineDb();
    await offlineDb.jobs.delete(id);
    this.syncToCloud(); // Async sync
  }

  // Equipment (simplified for now)
  async getEquipment() {
    const offlineDb = await this.getOfflineDb();
    return await offlineDb.equipment.toArray();
  }

  async createEquipment(equipment: any) {
    const newEquipment = {
      ...equipment,
      id: equipment.id || uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const offlineDb = await this.getOfflineDb();
    await offlineDb.equipment.add(newEquipment);
    return newEquipment;
  }

  async updateEquipment(id: string, updates: any) {
    const updated = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    const offlineDb = await this.getOfflineDb();
    await offlineDb.equipment.update(id, updated);
    return await offlineDb.equipment.get(id);
  }

  async deleteEquipment(id: string) {
    const offlineDb = await this.getOfflineDb();
    await offlineDb.equipment.delete(id);
  }

  // Equipment Items
  async getEquipmentItems() {
    const offlineDb = await this.getOfflineDb();
    return await offlineDb.equipment_items.toArray();
  }

  async createEquipmentItem(item: any) {
    const newItem = {
      ...item,
      id: item.id || uuidv4(),
      cloudId: item.id || uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: Date.now(),
      syncStatus: 'pending' as const
    };
    
    const offlineDb = await this.getOfflineDb();
    await offlineDb.equipment_items.add(newItem);
    this.syncToCloud(); // Async sync
    return newItem;
  }

  async updateEquipmentItem(id: string, updates: any) {
    const updated = {
      ...updates,
      updated_at: Date.now()
    };
    
    const offlineDb = await this.getOfflineDb();
    await offlineDb.equipment_items.update(id, updated);
    this.syncToCloud(); // Async sync
    return await offlineDb.equipment_items.get(id);
  }

  async deleteEquipmentItem(id: string) {
    const offlineDb = await this.getOfflineDb();
    await offlineDb.equipment_items.delete(id);
    this.syncToCloud(); // Async sync
  }

  // Individual Equipment
  async getIndividualEquipment() {
    const offlineDb = await this.getOfflineDb();
    return await offlineDb.individual_equipment.toArray();
  }

  async createIndividualEquipment(equipment: any) {
    const newEquipment = {
      ...equipment,
      id: equipment.id || uuidv4(),
      cloudId: equipment.id || uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: Date.now(),
      syncStatus: 'pending' as const
    };
    
    const offlineDb = await this.getOfflineDb();
    await offlineDb.individual_equipment.add(newEquipment);
    this.syncToCloud(); // Async sync
    return newEquipment;
  }

  async updateIndividualEquipment(id: string, updates: any) {
    const updated = {
      ...updates,
      updated_at: Date.now()
    };
    
    const offlineDb = await this.getOfflineDb();
    await offlineDb.individual_equipment.update(id, updated);
    this.syncToCloud(); // Async sync
    return await offlineDb.individual_equipment.get(id);
  }

  async deleteIndividualEquipment(id: string) {
    const offlineDb = await this.getOfflineDb();
    await offlineDb.individual_equipment.delete(id);
    this.syncToCloud(); // Async sync
  }
}

// Lazy-loaded singleton instance
let _hybridDb: HybridDatabaseClient | null = null;

export const getHybridDb = (): HybridDatabaseClient => {
  if (!_hybridDb) {
    _hybridDb = new HybridDatabaseClient();
  }
  return _hybridDb;
};

// Export for backward compatibility (will be lazy-loaded on first access)
export const hybridDb = new Proxy({} as HybridDatabaseClient, {
  get(target, prop) {
    const db = getHybridDb();
    return (db as any)[prop];
  }
});
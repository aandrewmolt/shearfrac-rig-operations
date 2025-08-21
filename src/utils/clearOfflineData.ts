import { offlineDb } from '@/lib/offline/offlineDatabase';

export async function clearOfflineData() {
  try {
    console.log('Clearing offline data...');
    
    // Clear all tables
    await offlineDb.jobs.clear();
    await offlineDb.equipment.clear();
    await offlineDb.equipment_types.clear();
    await offlineDb.storage_locations.clear();
    await offlineDb.syncQueue.clear();
    
    // Clear last sync timestamp
    localStorage.removeItem('lastSyncTimestamp');
    
    console.log('Offline data cleared successfully');
    return { success: true };
  } catch (error) {
    console.error('Error clearing offline data:', error);
    return { success: false, error };
  }
}
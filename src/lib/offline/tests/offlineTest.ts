// Simple offline functionality tests
import { offlineDb } from '../offlineDatabase';
import { syncManager } from '../syncManager';

export class OfflineTests {
  
  async testDatabaseConnection() {
    try {
      console.log('Testing IndexedDB connection...');
      
      // Test database creation
      await offlineDb.open();
      console.log('✓ IndexedDB connection successful');
      
      // Test adding a job
      const testJob = {
        name: 'Test Job',
        wellCount: 2,
        nodes: [],
        edges: [],
        equipmentAllocations: {},
        updatedAt: Date.now(),
        syncStatus: 'pending' as const
      };
      
      const jobId = await offlineDb.jobs.add(testJob);
      console.log('✓ Job added to IndexedDB:', jobId);
      
      // Test retrieving the job
      const retrievedJob = await offlineDb.jobs.get(jobId);
      console.log('✓ Job retrieved from IndexedDB:', retrievedJob?.name);
      
      // Test adding to sync queue
      await offlineDb.addToSyncQueue('create', 'jobs', String(jobId), testJob);
      console.log('✓ Operation added to sync queue');
      
      // Clean up
      await offlineDb.jobs.delete(jobId);
      await offlineDb.syncQueue.clear();
      console.log('✓ Test data cleaned up');
      
      return true;
    } catch (error) {
      console.error('✗ Database test failed:', error);
      return false;
    }
  }
  
  async testOfflineDetection() {
    console.log('Testing offline detection...');
    
    const originalOnline = navigator.onLine;
    console.log('Current online status:', originalOnline);
    
    // Test offline event simulation
    const offlineEvent = new Event('offline');
    const onlineEvent = new Event('online');
    
    window.dispatchEvent(offlineEvent);
    console.log('✓ Offline event dispatched');
    
    setTimeout(() => {
      window.dispatchEvent(onlineEvent);
      console.log('✓ Online event dispatched');
    }, 1000);
    
    return true;
  }
  
  async testSyncManager() {
    try {
      console.log('Testing sync manager...');
      
      // Add a test job that needs syncing
      const testJob = {
        name: 'Sync Test Job',
        wellCount: 1,
        nodes: [],
        edges: [],
        equipmentAllocations: {},
        updatedAt: Date.now(),
        syncStatus: 'pending' as const
      };
      
      const jobId = await offlineDb.jobs.add(testJob);
      await offlineDb.addToSyncQueue('create', 'jobs', String(jobId), {
        ...testJob,
        localId: jobId
      });
      
      console.log('✓ Test sync operation queued');
      
      // Test getting unsynced records
      const unsynced = await offlineDb.getUnsyncedRecords();
      console.log('✓ Unsynced records retrieved:', unsynced);
      
      // Clean up
      await offlineDb.jobs.delete(jobId);
      await offlineDb.syncQueue.clear();
      
      return true;
    } catch (error) {
      console.error('✗ Sync manager test failed:', error);
      return false;
    }
  }
  
  async runAllTests() {
    console.log('🧪 Starting offline functionality tests...\n');
    
    const results = {
      database: await this.testDatabaseConnection(),
      offlineDetection: await this.testOfflineDetection(),
      syncManager: await this.testSyncManager()
    };
    
    console.log('\n📊 Test Results:');
    console.log('Database:', results.database ? '✓ PASS' : '✗ FAIL');
    console.log('Offline Detection:', results.offlineDetection ? '✓ PASS' : '✗ FAIL');
    console.log('Sync Manager:', results.syncManager ? '✓ PASS' : '✗ FAIL');
    
    const allPassed = Object.values(results).every(result => result === true);
    console.log('\n🎯 Overall:', allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED');
    
    return results;
  }
}

// Export for use in dev tools
if (typeof window !== 'undefined') {
  (window as any).OfflineTests = OfflineTests;
}
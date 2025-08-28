# Claude Development Notes

## Equipment Hook Consolidation Project (2025-08-28) ✅

### Problem Identified
The codebase had grown to contain 96+ equipment-related hooks with significant redundancy:
- Multiple competing sync systems (4 different real-time sync hooks)
- Monolithic hooks exceeding 370+ lines each
- V1/V2 duplicate patterns throughout
- Deprecated localStorage-based system (`useInventoryData`) still in use
- Redundant tracked equipment system

### Solution Implemented

#### 1. Unified Sync System ✅
- **Replaced 4 competing sync hooks** with `useUnifiedEquipmentSync`
- **Created unified save manager** to replace 12+ save triggers
- **Eliminated save lock contentions** and race conditions

#### 2. Monolithic Hook Breakdown ✅
- **`useEquipmentUsageTracking`**: 370+ lines → 3 focused managers (47% reduction)
- **`useEquipmentValidation`**: 366+ lines → 2 focused managers (45% reduction)  
- **`useEquipmentSelection`**: 474 lines → 200 lines CRUD manager (58% reduction)
- **Total code reduction**: 1,210 lines → 600 lines (50% overall reduction)

#### 3. Manager Pattern Implementation ✅
- **Equipment CRUD Manager**: Unified create, read, update, delete operations
- **Equipment Search Manager**: Consolidated search and filtering functionality
- **Equipment Usage Manager**: Focused tracking and statistics
- **Equipment Validation Manager**: Inventory and availability validation

#### 4. Legacy Migration ✅
- **Created compatibility wrappers** for zero-downtime migration
- **Updated 12+ hooks** from deprecated `useInventoryData` to modern `useInventory`
- **Removed tracked equipment system** (moved to `/src/hooks_backup/`)
- **Maintained backward compatibility** throughout migration

#### 5. Duplicate Removal ✅
- **Removed 7 V1/V2 duplicate pairs**
- **Consolidated 96+ hooks** into focused manager pattern
- **Created single source of truth** for each equipment operation

### Files Created/Modified
- **New Managers**: `/src/hooks/equipment/managers/` (5 focused managers)
- **Legacy Wrappers**: `/src/hooks/equipment/` (7 compatibility hooks)
- **Unified Sync**: `/src/hooks/useUnifiedEquipmentSync.ts`
- **Backup Location**: `/src/hooks_backup/` (96+ deprecated hooks)

### Results
- **96+ hooks → 12 focused managers** (87% reduction)
- **50% code reduction** in monolithic hooks
- **Zero breaking changes** due to compatibility wrappers
- **Eliminated race conditions** in save/sync operations
- **Single source of truth** for equipment operations

## Bulk Equipment Inventory Management Fixed (2025-07-14)

### Problem Identified
The bulk item inventory system was flawed, creating deployment records in the same `equipment_items` table used for inventory tracking. This caused:
- Duplicate entries for the same equipment type
- Incorrect quantity tracking when equipment was deployed
- Missing source location tracking for returns
- Race conditions during allocation/return operations

### Solution Implemented

1. **New Deployment Table**: Created `bulk_equipment_deployments` table to properly track bulk item deployments separately from inventory
   - Tracks: equipment_type_id, job_id, source_location_id, quantity, deployed_at, returned_at, status
   - Proper indexes for performance

2. **Updated Allocation Logic**: 
   - Created `useBulkEquipmentAllocatorV2` hook that uses the new deployment table
   - Atomic transactions ensure inventory quantities and deployment records stay in sync
   - Proper source location tracking for accurate returns

3. **Fixed Return Process**:
   - Returns equipment to original source location, not just any location
   - Handles missing source items by creating them if needed
   - Proper status updates on deployment records

4. **Transaction Support**: All bulk operations now use proper database transactions to prevent race conditions

5. **Cleanup**: 
   - Removed old `createBulkAllocation` function that was creating duplicate records
   - Created migration script to clean up existing deployment records from equipment_items table

### Files Modified
- `src/lib/turso/schema.ts` - Added bulk_equipment_deployments table
- `src/types/equipment.ts` - Added BulkEquipmentDeployment interface
- `src/hooks/equipment/useBulkEquipmentAllocatorV2.ts` - New allocator using deployment table
- `src/hooks/equipment/useEquipmentReturn.ts` - Updated return logic
- `src/services/tursoDb.ts` - Added bulk deployment CRUD operations
- `src/utils/transactionWrapper.ts` - Added support for bulk_equipment_deployments
- `src/lib/turso/migrations/cleanupDeploymentRecords.ts` - Migration to clean old records

## Critical Issues Fixed (2025-06-23)

### 1. Realtime Connection Issues ✅
- **Fixed**: Removed duplicate realtime management system (`realtimeManager.ts`)
- **Fixed**: Memory leak in `RealtimeConnectionMonitor` caused by effect dependency cycle
- **Solution**: Used refs to store channel and interval references, separated heartbeat logic into its own effect

### 2. Equipment Status Validation ✅
- **Added**: Comprehensive status validation system in `utils/equipmentStatusValidation.ts`
- **Fixed**: All equipment mutations now validate status before database operations
- **Features**:
  - Validates against allowed status values: 'available', 'deployed', 'maintenance', 'red-tagged', 'retired'
  - Prevents invalid status transitions (e.g., can't change from 'retired' to anything else)
  - Sanitizes common misspellings and variations
  - Shows user-friendly error messages

### 3. Transaction Support ✅
- **Added**: Transaction wrapper in `utils/transactionWrapper.ts`
- **Features**:
  - Atomic operations with automatic rollback on failure
  - Support for insert, update, and delete operations
  - Batch operation helpers
  - Created `useTransactionalSave` hook for atomic job saves

### 4. Retry Logic with Exponential Backoff ✅
- **Added**: Retry mechanism in `utils/retryWithBackoff.ts`
- **Features**:
  - Configurable retry attempts and delays
  - Exponential backoff to prevent overwhelming the server
  - Circuit breaker pattern to prevent cascading failures
  - Supabase-specific error handling
- **Applied to**:
  - Job save operations
  - Equipment mutations

### 5. Issues Still Pending
- **Local Storage Backup**: Need to implement offline data persistence
- **Cable Type Migration**: Need to ensure all edges have proper cable type IDs
- **Connection Health Monitoring**: Need to add auto-reconnect functionality
- **Error Boundaries**: Need to implement React error boundaries for better error recovery

## Key Files Modified

1. **src/components/RealtimeConnectionMonitor.tsx** - Fixed memory leak
2. **src/utils/equipmentStatusValidation.ts** - New validation system
3. **src/utils/transactionWrapper.ts** - New transaction support
4. **src/utils/retryWithBackoff.ts** - New retry logic
5. **src/hooks/supabase/useSupabaseEquipmentMutations.ts** - Added validation and retry
6. **src/hooks/useSupabaseJobs.ts** - Added retry logic
7. **src/hooks/bulk/useBulkStatusUpdate.ts** - Added status validation
8. **src/hooks/inventory/useIndividualEquipmentOperations.ts** - Added status validation
9. **src/hooks/diagram/useTransactionalSave.ts** - New transactional save operations

## Module Initialization Fixes (2025-07-15)

### Problem Identified
Multiple "Cannot access before initialization" errors in Vercel production builds caused by module-level code execution and instantiation.

### Fixed Files
1. **App.tsx** - Fixed QueryClient instantiation with lazy initialization
2. **realtimeChannelStore.ts** - Fixed global Maps with getter functions
3. **use-toast.ts** - Fixed count, listeners, memoryState, and toastTimeouts with lazy initialization
4. **deploymentHelper.ts** - Removed module-level code execution
5. **edgeErrorHandling.ts** - Fixed mismatched function signatures
6. **Plus 9 previously fixed files** - serviceWorker.ts, blob/client.ts, database.config.ts, simple-auth.ts, hybrid-client.ts, saveLock.ts, supabaseRealtimeConfig.ts, offlineDatabase.ts, syncManager.ts

### Key Pattern Applied
Replaced module-level instantiation with lazy initialization using:
- Proxy objects for singletons
- Getter functions for Maps/Sets/Arrays
- Arrow functions in useState for Date objects
- Removed all module-level code execution

## Linting Commands
- Run linter: `npm run lint`
- Run type checking: `npx tsc --noEmit`

## Next Steps
1. Implement local storage backup for diagram data
2. Fix cable type migration issues
3. Add connection health monitoring with auto-reconnect
4. Implement error boundaries for component error recovery
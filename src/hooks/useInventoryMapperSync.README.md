# useInventoryMapperSync Hook

A React hook that provides synchronization between inventory and mapper components, ensuring equipment availability validation, conflict resolution, and real-time status updates.

## Setup

### 1. Add the Context Provider

Wrap your application with the `InventoryMapperProvider`:

```tsx
import { InventoryMapperProvider } from '@/contexts/InventoryMapperContext';

function App() {
  return (
    <InventoryMapperProvider>
      {/* Your app components */}
    </InventoryMapperProvider>
  );
}
```

### 2. Use the Hook

```tsx
import { useInventoryMapperSync } from '@/hooks/useInventoryMapperSync';

function MyComponent() {
  const {
    isValidating,
    conflicts,
    allocations,
    validateEquipmentAvailability,
    allocateEquipment,
    releaseEquipment,
    resolveConflict,
    syncInventoryStatus,
    getEquipmentStatus,
    getJobEquipment
  } = useInventoryMapperSync();

  // Your component logic
}
```

## Features

### 1. Real-time Equipment Monitoring

The hook monitors equipment changes and provides real-time status updates:

```tsx
const status = getEquipmentStatus('SS-001'); // Returns: 'available' | 'allocated' | 'deployed' | 'unavailable'
```

### 2. Equipment Availability Validation

Before assigning equipment to a job, validate its availability:

```tsx
const isAvailable = await validateEquipmentAvailability('SS-001', 'job-123');
if (isAvailable) {
  // Proceed with allocation
}
```

### 3. Equipment Allocation

Allocate equipment to a job:

```tsx
await allocateEquipment('SS-001', 'job-123', 'Well Site Alpha');
```

### 4. Equipment Release

Release equipment from a job:

```tsx
await releaseEquipment('SS-001', 'job-123');
```

### 5. Conflict Resolution

When equipment is double-booked, the hook detects conflicts:

```tsx
// Monitor conflicts
conflicts.forEach(conflict => {
  console.log(`Equipment ${conflict.equipmentName} is conflicted between ${conflict.currentJobName} and ${conflict.requestedJobName}`);
});

// Resolve a conflict
await resolveConflict(conflict, 'requested'); // or 'current'
```

### 6. Job Equipment Tracking

Get all equipment assigned to a specific job:

```tsx
const equipmentIds = getJobEquipment('job-123');
```

### 7. Inventory Synchronization

Sync inventory status with current allocations:

```tsx
await syncInventoryStatus();
```

## Components

### ConflictResolver

A UI component that displays and allows resolution of equipment conflicts:

```tsx
import { ConflictResolver } from '@/components/InventoryMapperSync';

function MyPage() {
  return (
    <div>
      {/* Your content */}
      <ConflictResolver />
    </div>
  );
}
```

### SyncStatusIndicator

Shows the current synchronization status:

```tsx
import { SyncStatusIndicator } from '@/components/InventoryMapperSync';

function Header() {
  return (
    <div className="header">
      <SyncStatusIndicator />
    </div>
  );
}
```

### EquipmentAllocationManager

A complete equipment allocation interface for a job:

```tsx
import { EquipmentAllocationManager } from '@/components/InventoryMapperSync';

function JobDetails({ jobId, jobName }) {
  return (
    <EquipmentAllocationManager 
      jobId={jobId} 
      jobName={jobName} 
    />
  );
}
```

## Context API

The `InventoryMapperContext` provides additional low-level controls:

```tsx
import { useInventoryMapperContext } from '@/contexts/InventoryMapperContext';

function AdvancedComponent() {
  const {
    sharedEquipmentState,
    updateSharedEquipment,
    subscribeToEquipmentChanges,
    batchUpdateEquipment,
    syncStatus,
    setSyncStatus
  } = useInventoryMapperContext();

  // Subscribe to changes for specific equipment
  useEffect(() => {
    const unsubscribe = subscribeToEquipmentChanges('SS-001', (state) => {
      console.log('Equipment state changed:', state);
    });

    return unsubscribe;
  }, []);

  // Batch update multiple equipment items
  batchUpdateEquipment([
    { equipmentId: 'SS-001', state: { status: 'deployed' } },
    { equipmentId: 'SS-002', state: { status: 'available' } }
  ]);
}
```

## Integration Example

Here's a complete example of integrating the sync system into an existing job management component:

```tsx
import React, { useEffect } from 'react';
import { useInventoryMapperSync } from '@/hooks/useInventoryMapperSync';
import { ConflictResolver, SyncStatusIndicator } from '@/components/InventoryMapperSync';

function JobEquipmentManager({ job }) {
  const {
    allocateEquipment,
    releaseEquipment,
    getJobEquipment,
    syncInventoryStatus
  } = useInventoryMapperSync();

  useEffect(() => {
    // Sync on component mount
    syncInventoryStatus();
  }, []);

  const handleEquipmentAdd = async (equipmentId) => {
    try {
      await allocateEquipment(equipmentId, job.id, job.name);
    } catch (error) {
      // Error handling
    }
  };

  const handleEquipmentRemove = async (equipmentId) => {
    try {
      await releaseEquipment(equipmentId, job.id);
    } catch (error) {
      // Error handling
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2>Equipment Management</h2>
        <SyncStatusIndicator />
      </div>
      
      {/* Your equipment UI */}
      
      <ConflictResolver />
    </div>
  );
}
```

## Best Practices

1. **Always validate before allocating**: Use `validateEquipmentAvailability` before calling `allocateEquipment`
2. **Handle conflicts promptly**: Monitor the `conflicts` array and provide UI for resolution
3. **Sync regularly**: Call `syncInventoryStatus` after batch operations or on key user actions
4. **Use batch operations**: When updating multiple equipment items, use `batchUpdateEquipment`
5. **Subscribe to changes**: For real-time UI updates, use `subscribeToEquipmentChanges`

## Error Handling

The hook provides toast notifications for common errors. For custom error handling:

```tsx
try {
  await allocateEquipment(equipmentId, jobId, jobName);
} catch (error) {
  if (error.message.includes('not available')) {
    // Handle availability error
  } else {
    // Handle other errors
  }
}
```
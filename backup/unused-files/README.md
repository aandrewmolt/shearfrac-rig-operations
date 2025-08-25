# Backup of Unused Files

**Backup Created:** 2025-08-25

This folder contains copies of files that were removed from the main codebase during cleanup.

## Removed Files

### Components (src/components/inventory/)
- **StorageLocationManager.tsx** - Replaced by UnifiedLocationsManager.tsx
- **EquipmentTransferSystem.tsx** - Functionality moved to UnifiedLocationsManager.tsx
- **ComprehensiveInventoryDashboard.tsx** - Not imported anywhere
- **EnhancedInventoryDashboard.tsx** - Not imported anywhere  
- **InventoryDashboard.tsx** - Not imported anywhere
- **EquipmentTransferPanel.tsx** - Not imported anywhere
- **StorageTransferManager.tsx** - Only used by deleted EquipmentTransferSystem

### Documentation/Updates
- **equipment-inventory-mobile.txt** - Outdated documentation
- **file-placement-guide.md** - Outdated documentation
- **implementation-summary.md** - Outdated documentation

## Recovery Instructions

If you need to restore any of these files:

1. Copy the file from this backup folder back to its original location
2. Add any necessary imports back to the files that use it
3. Update the component exports if needed

## Context

These files were removed as part of the UnifiedLocationsManager implementation that consolidated location and job management functionality into a single comprehensive interface.
import React from 'react';
import { vi } from 'vitest';

// Mock InventoryProvider for testing
export const InventoryProvider = ({ children, value }: { children: React.ReactNode; value: unknown }) => {
  const InventoryContext = React.createContext(value);
  
  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};

// Mock useInventory hook
export const useInventory = () => {
  const context = React.useContext(React.createContext({
    data: {
      equipmentItems: [],
      individualEquipment: [],
      equipmentTypes: [],
    },
    loading: false,
    error: null,
    updateIndividualEquipment: vi.fn(),
    updateSingleEquipmentItem: vi.fn(),
    getAvailableQuantityByType: vi.fn(),
    syncData: vi.fn(),
  }));
  
  return context;
};
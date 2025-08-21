import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InventoryMapperProvider } from '@/contexts/InventoryMapperContext';
import { vi } from 'vitest';

// Mock InventoryProvider and context
const InventoryContext = React.createContext<unknown>(null);

export const InventoryProvider = ({ children, value }: { children: React.ReactNode; value: unknown }) => (
  <InventoryContext.Provider value={value}>
    {children}
  </InventoryContext.Provider>
);

export const useInventory = () => {
  const context = React.useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within InventoryProvider');
  }
  return context;
};

// Mock Database client
export const mockDatabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  })),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
    signIn: vi.fn(),
    signOut: vi.fn(),
  },
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  })),
};

// Create a test query client
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

// Mock inventory data
export const mockInventoryData = {
  equipmentItems: [
    {
      id: 'item-1',
      typeId: 'type-1',
      name: 'Test Equipment 1',
      quantity: 5,
      status: 'available',
      jobId: undefined,
      lastUpdated: new Date('2024-01-01'),
    },
    {
      id: 'item-2',
      typeId: 'type-2',
      name: 'Test Equipment 2',
      quantity: 3,
      status: 'deployed',
      jobId: 'job-1',
      lastUpdated: new Date('2024-01-01'),
    },
  ],
  individualEquipment: [
    {
      id: 'ind-1',
      equipmentId: 'eq-1',
      name: 'Individual Equipment 1',
      typeId: 'type-1',
      status: 'available',
      jobId: undefined,
      lastUpdated: new Date('2024-01-01'),
    },
    {
      id: 'ind-2',
      equipmentId: 'eq-2',
      name: 'Individual Equipment 2',
      typeId: 'type-2',
      status: 'deployed',
      jobId: 'job-1',
      lastUpdated: new Date('2024-01-01'),
    },
    {
      id: 'ind-3',
      equipmentId: 'eq-3',
      name: 'Individual Equipment 3',
      typeId: 'type-3',
      status: 'maintenance',
      jobId: undefined,
      lastUpdated: new Date('2024-01-01'),
    },
  ],
  equipmentTypes: [
    {
      id: 'type-1',
      name: 'Type 1',
      category: 'Category A',
    },
    {
      id: 'type-2',
      name: 'Type 2',
      category: 'Category B',
    },
  ],
};

// Mock inventory context value
export const createMockInventoryContext = (overrides = {}) => ({
  data: mockInventoryData,
  loading: false,
  error: null,
  updateIndividualEquipment: vi.fn().mockResolvedValue(undefined),
  updateSingleEquipmentItem: vi.fn().mockResolvedValue(undefined),
  getAvailableQuantityByType: vi.fn((typeId: string) => {
    const items = mockInventoryData.equipmentItems.filter(
      item => item.typeId === typeId && item.status === 'available'
    );
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }),
  syncData: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  inventoryContextValue?: ReturnType<typeof createMockInventoryContext>;
  queryClient?: QueryClient;
}

export const customRender = (
  ui: ReactElement,
  {
    inventoryContextValue,
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <InventoryMapperProvider>
        {inventoryContextValue ? (
          <InventoryProvider value={inventoryContextValue}>
            {children}
          </InventoryProvider>
        ) : (
          children
        )}
      </InventoryMapperProvider>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: AllTheProviders, ...renderOptions });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Helper to create mock conflicts
export const createMockConflict = (overrides = {}) => ({
  equipmentId: 'eq-1',
  equipmentName: 'Test Equipment',
  currentJobId: 'job-1',
  currentJobName: 'Current Job',
  requestedJobId: 'job-2',
  requestedJobName: 'Requested Job',
  timestamp: new Date(),
  ...overrides,
});

// Helper to create mock allocations
export const createMockAllocation = (overrides = {}) => ({
  equipmentId: 'eq-1',
  jobId: 'job-1',
  jobName: 'Test Job',
  allocatedAt: new Date(),
  status: 'allocated' as const,
  ...overrides,
});

// Wait for async updates
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));
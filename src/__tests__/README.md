# Inventory Mapper Sync Test Suite

This directory contains comprehensive tests for the inventory-mapper synchronization system.

## Test Structure

```
__tests__/
├── hooks/
│   └── useInventoryMapperSync.test.tsx    # Unit tests for the main hook
├── contexts/
│   └── InventoryMapperContext.test.tsx    # Integration tests for context
├── components/
│   └── ConflictResolver.test.tsx          # Component tests
├── e2e/
│   └── inventory-mapper-sync.e2e.test.tsx # End-to-end scenarios
├── utils/
│   ├── test-utils.tsx                     # Test utilities and helpers
│   └── mock-providers.tsx                 # Mock providers
└── setup.ts                               # Test environment setup
```

## Running Tests

### Install Dependencies
First, install the required testing dependencies:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### Run All Tests
```bash
npm run test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Specific Test Files
```bash
# Run only hook tests
npm run test src/__tests__/hooks/

# Run only E2E tests
npm run test src/__tests__/e2e/
```

## Test Categories

### 1. Unit Tests (useInventoryMapperSync.test.tsx)
Tests the core hook functionality in isolation:
- Equipment validation logic
- Allocation and release operations
- Conflict detection and resolution
- Status synchronization
- Error handling

### 2. Integration Tests (InventoryMapperContext.test.tsx)
Tests the context provider and state management:
- Shared equipment state updates
- Conflict management
- Allocation tracking
- Real-time subscriptions
- Batch operations

### 3. Component Tests (ConflictResolver.test.tsx)
Tests the UI component behavior:
- Rendering logic
- User interactions
- Styling and layout
- Accessibility
- Dynamic updates

### 4. End-to-End Tests (inventory-mapper-sync.e2e.test.tsx)
Tests complete workflows:
- Full equipment allocation lifecycle
- Conflict resolution workflows
- Bulk operations
- Error scenarios
- Performance with large datasets

## Test Utilities

### Mock Data Generators
- `createMockConflict()` - Creates test conflict objects
- `createMockAllocation()` - Creates test allocation objects
- `createMockInventoryContext()` - Creates mock inventory context

### Custom Render Function
The `customRender` function wraps components with all required providers:
```typescript
customRender(<YourComponent />, {
  inventoryContextValue: mockInventoryContext,
  queryClient: customQueryClient
});
```

### Mock Providers
- `mockSupabaseClient` - Mocked Supabase client
- `InventoryProvider` - Test implementation of inventory provider
- `createTestQueryClient` - Creates configured query client for tests

## Writing New Tests

### Test Structure Template
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup test environment
  });

  describe('Scenario', () => {
    it('should do something specific', async () => {
      // Arrange
      const { result } = renderHook(...);
      
      // Act
      await act(async () => {
        await result.current.someMethod();
      });
      
      // Assert
      expect(result.current.someValue).toBe(expected);
    });
  });
});
```

### Best Practices
1. Use descriptive test names that explain the behavior
2. Follow AAA pattern: Arrange, Act, Assert
3. Mock external dependencies
4. Test edge cases and error scenarios
5. Keep tests focused and isolated
6. Use `waitFor` for async operations
7. Clean up after tests with `afterEach`

## Coverage Goals
- Aim for >80% code coverage
- Focus on critical business logic
- Test error paths and edge cases
- Ensure all user interactions are tested

## Debugging Tests

### Visual Debugging
```typescript
import { screen, debug } from '@testing-library/react';

// Debug entire document
debug();

// Debug specific element
debug(screen.getByText('Some Text'));
```

### Console Logging
Tests run with console output, so you can use `console.log` for debugging.

### Step-by-Step Debugging
Use your IDE's debugger with breakpoints in test files.

## Common Issues and Solutions

### Issue: Tests timing out
Solution: Use `waitFor` with appropriate timeout:
```typescript
await waitFor(() => {
  expect(something).toBe(true);
}, { timeout: 5000 });
```

### Issue: Can't find element
Solution: Use appropriate queries and check async rendering:
```typescript
// For elements that appear asynchronously
const element = await screen.findByText('Text');

// For checking non-existence
expect(screen.queryByText('Text')).not.toBeInTheDocument();
```

### Issue: State not updating
Solution: Wrap state updates in `act`:
```typescript
await act(async () => {
  result.current.updateState(newValue);
});
```
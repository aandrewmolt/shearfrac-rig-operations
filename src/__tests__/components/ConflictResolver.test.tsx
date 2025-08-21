import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConflictResolver } from '@/components/InventoryMapperSync/ConflictResolver';
import { useInventoryMapperSync } from '@/hooks/useInventoryMapperSync';
import { createMockConflict } from '../utils/test-utils';

// Mock the hook
vi.mock('@/hooks/useInventoryMapperSync');

describe('ConflictResolver', () => {
  const mockResolveConflict = vi.fn();
  const mockConflicts = [
    createMockConflict({
      equipmentId: 'eq-1',
      equipmentName: 'Drilling Rig A',
      currentJobId: 'job-1',
      currentJobName: 'Well Site Alpha',
      requestedJobId: 'job-2',
      requestedJobName: 'Well Site Beta',
    }),
    createMockConflict({
      equipmentId: 'eq-2',
      equipmentName: 'Pump Unit B',
      currentJobId: 'job-3',
      currentJobName: 'Well Site Gamma',
      requestedJobId: 'job-4',
      requestedJobName: 'Well Site Delta',
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useInventoryMapperSync as ReturnType<typeof vi.fn>).mockReturnValue({
      conflicts: mockConflicts,
      resolveConflict: mockResolveConflict,
    });
  });

  describe('Rendering', () => {
    it('should not render when there are no conflicts', () => {
      (useInventoryMapperSync as ReturnType<typeof vi.fn>).mockReturnValue({
        conflicts: [],
        resolveConflict: mockResolveConflict,
      });

      const { container } = render(<ConflictResolver />);
      expect(container.firstChild).toBeNull();
    });

    it('should render conflict list when conflicts exist', () => {
      render(<ConflictResolver />);

      expect(screen.getByText('Equipment Conflicts (2)')).toBeInTheDocument();
      expect(screen.getByText('Drilling Rig A')).toBeInTheDocument();
      expect(screen.getByText('Pump Unit B')).toBeInTheDocument();
    });

    it('should display conflict details correctly', () => {
      render(<ConflictResolver />);

      // First conflict
      expect(screen.getByText('Current: Well Site Alpha')).toBeInTheDocument();
      expect(screen.getByText('Requested: Well Site Beta')).toBeInTheDocument();

      // Second conflict
      expect(screen.getByText('Current: Well Site Gamma')).toBeInTheDocument();
      expect(screen.getByText('Requested: Well Site Delta')).toBeInTheDocument();
    });

    it('should show action buttons for each conflict', () => {
      render(<ConflictResolver />);

      const keepCurrentButtons = screen.getAllByText('Keep Current');
      const moveToRequestedButtons = screen.getAllByText('Move to Requested');

      expect(keepCurrentButtons).toHaveLength(2);
      expect(moveToRequestedButtons).toHaveLength(2);
    });

    it('should display warning icon', () => {
      render(<ConflictResolver />);

      // Check for the AlertTriangle icon by looking for its container
      const headerIcons = screen.getByText('Equipment Conflicts (2)').parentElement?.querySelectorAll('svg');
      expect(headerIcons).toBeDefined();
      expect(headerIcons?.length).toBeGreaterThan(0);
    });
  });

  describe('User Interactions', () => {
    it('should call resolveConflict with current when Keep Current is clicked', async () => {
      render(<ConflictResolver />);

      const keepCurrentButtons = screen.getAllByText('Keep Current');
      fireEvent.click(keepCurrentButtons[0]);

      await waitFor(() => {
        expect(mockResolveConflict).toHaveBeenCalledWith(mockConflicts[0], 'current');
      });
    });

    it('should call resolveConflict with requested when Move to Requested is clicked', async () => {
      render(<ConflictResolver />);

      const moveButtons = screen.getAllByText('Move to Requested');
      fireEvent.click(moveButtons[0]);

      await waitFor(() => {
        expect(mockResolveConflict).toHaveBeenCalledWith(mockConflicts[0], 'requested');
      });
    });

    it('should handle resolution errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockResolveConflict.mockRejectedValueOnce(new Error('Resolution failed'));

      render(<ConflictResolver />);

      const keepCurrentButtons = screen.getAllByText('Keep Current');
      fireEvent.click(keepCurrentButtons[0]);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to resolve conflict:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });

    it('should handle multiple conflict resolutions', async () => {
      render(<ConflictResolver />);

      // Resolve first conflict
      const keepCurrentButtons = screen.getAllByText('Keep Current');
      fireEvent.click(keepCurrentButtons[0]);

      // Resolve second conflict
      const moveButtons = screen.getAllByText('Move to Requested');
      fireEvent.click(moveButtons[1]);

      await waitFor(() => {
        expect(mockResolveConflict).toHaveBeenCalledTimes(2);
        expect(mockResolveConflict).toHaveBeenNthCalledWith(1, mockConflicts[0], 'current');
        expect(mockResolveConflict).toHaveBeenNthCalledWith(2, mockConflicts[1], 'requested');
      });
    });
  });

  describe('Styling and Layout', () => {
    it('should have proper positioning classes', () => {
      render(<ConflictResolver />);

      const container = screen.getByText('Equipment Conflicts (2)').closest('div[class*="fixed"]');
      expect(container).toHaveClass('fixed', 'bottom-4', 'right-4');
    });

    it('should have scrollable conflict list', () => {
      render(<ConflictResolver />);

      const scrollContainer = screen.getByText('Drilling Rig A').closest('div[class*="overflow-y-auto"]');
      expect(scrollContainer).toHaveClass('overflow-y-auto', 'max-h-64');
    });

    it('should style buttons appropriately', () => {
      render(<ConflictResolver />);

      const keepCurrentButton = screen.getAllByText('Keep Current')[0];
      const moveButton = screen.getAllByText('Move to Requested')[0];

      expect(keepCurrentButton).toHaveClass('bg-gray-100', 'hover:bg-gray-200', 'text-gray-700');
      expect(moveButton).toHaveClass('bg-blue-500', 'hover:bg-blue-600', 'text-white');
    });

    it('should have proper spacing between conflicts', () => {
      render(<ConflictResolver />);

      const conflictContainer = screen.getByText('Drilling Rig A').closest('div[class*="space-y-3"]');
      expect(conflictContainer).toHaveClass('space-y-3');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single conflict', () => {
      (useInventoryMapperSync as ReturnType<typeof vi.fn>).mockReturnValue({
        conflicts: [mockConflicts[0]],
        resolveConflict: mockResolveConflict,
      });

      render(<ConflictResolver />);

      expect(screen.getByText('Equipment Conflicts (1)')).toBeInTheDocument();
      expect(screen.getByText('Drilling Rig A')).toBeInTheDocument();
      expect(screen.queryByText('Pump Unit B')).not.toBeInTheDocument();
    });

    it('should handle many conflicts with scrolling', () => {
      const manyConflicts = Array.from({ length: 10 }, (_, i) =>
        createMockConflict({
          equipmentId: `eq-${i}`,
          equipmentName: `Equipment ${i}`,
          currentJobName: `Current Job ${i}`,
          requestedJobName: `Requested Job ${i}`,
        })
      );

      (useInventoryMapperSync as ReturnType<typeof vi.fn>).mockReturnValue({
        conflicts: manyConflicts,
        resolveConflict: mockResolveConflict,
      });

      render(<ConflictResolver />);

      expect(screen.getByText('Equipment Conflicts (10)')).toBeInTheDocument();
      
      // Check that the container has scroll capability
      const scrollContainer = screen.getByText('Equipment 0').closest('div[class*="overflow-y-auto"]');
      expect(scrollContainer).toHaveClass('max-h-64');
    });

    it('should handle long equipment names', () => {
      const longNameConflict = createMockConflict({
        equipmentName: 'Very Long Equipment Name That Might Cause Layout Issues In The UI Component',
        currentJobName: 'Another Very Long Job Name That Tests Text Wrapping',
        requestedJobName: 'Yet Another Extremely Long Job Name For Testing Purposes',
      });

      (useInventoryMapperSync as ReturnType<typeof vi.fn>).mockReturnValue({
        conflicts: [longNameConflict],
        resolveConflict: mockResolveConflict,
      });

      render(<ConflictResolver />);

      expect(screen.getByText(longNameConflict.equipmentName)).toBeInTheDocument();
      expect(screen.getByText(`Current: ${longNameConflict.currentJobName}`)).toBeInTheDocument();
      expect(screen.getByText(`Requested: ${longNameConflict.requestedJobName}`)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      render(<ConflictResolver />);

      const keepCurrentButtons = screen.getAllByText('Keep Current');
      const moveButtons = screen.getAllByText('Move to Requested');

      keepCurrentButtons.forEach(button => {
        expect(button.tagName).toBe('BUTTON');
      });

      moveButtons.forEach(button => {
        expect(button.tagName).toBe('BUTTON');
      });
    });

    it('should handle keyboard navigation', () => {
      render(<ConflictResolver />);

      const firstKeepButton = screen.getAllByText('Keep Current')[0];
      const firstMoveButton = screen.getAllByText('Move to Requested')[0];

      // Simulate tab navigation
      firstKeepButton.focus();
      expect(document.activeElement).toBe(firstKeepButton);

      fireEvent.keyDown(firstKeepButton, { key: 'Tab' });
      // In real browser, focus would move to next button
    });
  });

  describe('Dynamic Updates', () => {
    it('should update when conflicts change', () => {
      const { rerender } = render(<ConflictResolver />);

      expect(screen.getByText('Equipment Conflicts (2)')).toBeInTheDocument();

      // Update mock to have fewer conflicts
      (useInventoryMapperSync as ReturnType<typeof vi.fn>).mockReturnValue({
        conflicts: [mockConflicts[0]],
        resolveConflict: mockResolveConflict,
      });

      rerender(<ConflictResolver />);

      expect(screen.getByText('Equipment Conflicts (1)')).toBeInTheDocument();
      expect(screen.queryByText('Pump Unit B')).not.toBeInTheDocument();
    });

    it('should disappear when all conflicts are resolved', () => {
      const { rerender } = render(<ConflictResolver />);

      expect(screen.getByText('Equipment Conflicts (2)')).toBeInTheDocument();

      // Update mock to have no conflicts
      (useInventoryMapperSync as ReturnType<typeof vi.fn>).mockReturnValue({
        conflicts: [],
        resolveConflict: mockResolveConflict,
      });

      rerender(<ConflictResolver />);

      expect(screen.queryByText(/Equipment Conflicts/)).not.toBeInTheDocument();
    });
  });
});
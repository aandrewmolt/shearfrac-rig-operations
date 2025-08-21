import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, ChevronRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ResponsiveTableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  priority?: 'high' | 'medium' | 'low'; // For responsive hiding
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  width?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: ResponsiveTableColumn<T>[];
  onRowClick?: (item: T) => void;
  actions?: Array<{
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    onClick: (item: T) => void;
    variant?: 'default' | 'destructive';
  }>;
  emptyMessage?: string;
  loading?: boolean;
  cardView?: boolean; // Force card view even on desktop
  getRowId: (item: T) => string;
  selectedRows?: string[];
  onSelectRow?: (id: string, selected: boolean) => void;
  bulkActions?: React.ReactNode;
}

export function ResponsiveTable<T>({
  data,
  columns,
  onRowClick,
  actions,
  emptyMessage = 'No items found',
  loading = false,
  cardView = false,
  getRowId,
  selectedRows = [],
  onSelectRow,
  bulkActions,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();
  const showAsCards = isMobile || cardView;

  // Filter columns by priority for mobile
  const visibleColumns = React.useMemo(() => {
    if (!isMobile) return columns;
    return columns.filter(col => col.priority === 'high' || !col.priority);
  }, [columns, isMobile]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-gray-500 text-center">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  // Card view for mobile
  if (showAsCards) {
    return (
      <div className="space-y-3">
        {selectedRows.length > 0 && bulkActions && (
          <div className="sticky top-0 z-10 bg-white border rounded-lg p-3 shadow-sm">
            {bulkActions}
          </div>
        )}
        
        {data.map((item) => {
          const id = getRowId(item);
          const isSelected = selectedRows.includes(id);
          
          return (
            <Card
              key={id}
              className={cn(
                "relative transition-all",
                onRowClick && "cursor-pointer hover:shadow-md",
                isSelected && "ring-2 ring-blue-500"
              )}
              onClick={() => onRowClick?.(item)}
            >
              <CardContent className="p-4">
                {/* Selection checkbox */}
                {onSelectRow && (
                  <div className="absolute top-4 left-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        onSelectRow(id, e.target.checked);
                      }}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
                
                {/* Card content */}
                <div className={cn("space-y-2", onSelectRow && "pl-8")}>
                  {columns.map((column) => {
                    const value = column.render(item);
                    
                    // Skip rendering if value is null/undefined
                    if (value === null || value === undefined) return null;
                    
                    // Determine if this is the primary field (first high priority column)
                    const isPrimary = column.priority === 'high' && 
                      columns.findIndex(c => c.priority === 'high') === columns.indexOf(column);
                    
                    return (
                      <div key={column.key} className={cn(
                        "flex",
                        isPrimary ? "flex-col" : "flex-row justify-between items-start"
                      )}>
                        {!isPrimary && (
                          <span className="text-sm text-gray-500 font-medium">
                            {column.header}:
                          </span>
                        )}
                        <div className={cn(
                          isPrimary ? "text-base font-semibold" : "text-sm text-right",
                          "flex-1"
                        )}>
                          {value}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Actions */}
                {actions && actions.length > 0 && (
                  <div className="absolute top-4 right-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions.map((action, idx) => {
                          const Icon = action.icon;
                          return (
                            <DropdownMenuItem
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                action.onClick(item);
                              }}
                              className={cn(
                                action.variant === 'destructive' && "text-red-600"
                              )}
                            >
                              {Icon && <Icon className="h-4 w-4 mr-2" />}
                              {action.label}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                
                {/* Row click indicator */}
                {onRowClick && !actions && (
                  <div className="absolute top-1/2 right-4 -translate-y-1/2">
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className="w-full">
      {selectedRows.length > 0 && bulkActions && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          {bulkActions}
        </div>
      )}
      
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {onSelectRow && (
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === data.length && data.length > 0}
                    onChange={(e) => {
                      data.forEach(item => {
                        onSelectRow(getRowId(item), e.target.checked);
                      });
                    }}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                </th>
              )}
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                    column.align === 'center' && "text-center",
                    column.align === 'right' && "text-right",
                    column.width
                  )}
                >
                  {column.header}
                </th>
              ))}
              {actions && actions.length > 0 && (
                <th className="w-20 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((item) => {
              const id = getRowId(item);
              const isSelected = selectedRows.includes(id);
              
              return (
                <tr
                  key={id}
                  className={cn(
                    "transition-colors",
                    onRowClick && "cursor-pointer hover:bg-gray-50",
                    isSelected && "bg-blue-50"
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {onSelectRow && (
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          onSelectRow(id, e.target.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                    </td>
                  )}
                  {visibleColumns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-4 py-4 text-sm",
                        column.align === 'center' && "text-center",
                        column.align === 'right' && "text-right"
                      )}
                    >
                      {column.render(item)}
                    </td>
                  ))}
                  {actions && actions.length > 0 && (
                    <td className="px-4 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {actions.map((action, idx) => {
                            const Icon = action.icon;
                            return (
                              <DropdownMenuItem
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  action.onClick(item);
                                }}
                                className={cn(
                                  action.variant === 'destructive' && "text-red-600"
                                )}
                              >
                                {Icon && <Icon className="h-4 w-4 mr-2" />}
                                {action.label}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
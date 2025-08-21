import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, 
  MapPin, 
  User, 
  Package, 
  TrendingUp, 
  TrendingDown,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight
} from 'lucide-react';
import { useEquipmentHistory } from '@/hooks/equipment/useEquipmentHistory';
import { IndividualEquipment } from '@/types/inventory';
import { format } from 'date-fns';

interface EquipmentHistoryViewerProps {
  equipment?: IndividualEquipment;
  isOpen: boolean;
  onClose: () => void;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'created':
      return <Package className="h-4 w-4" />;
    case 'deployed':
      return <TrendingUp className="h-4 w-4 text-blue-500" />;
    case 'returned':
      return <TrendingDown className="h-4 w-4 text-green-500" />;
    case 'maintenance':
      return <Wrench className="h-4 w-4 text-orange-500" />;
    case 'red-tagged':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'status-change':
      return <CheckCircle className="h-4 w-4 text-purple-500" />;
    case 'location-change':
      return <MapPin className="h-4 w-4 text-indigo-500" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'deployed':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'returned':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'maintenance':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'red-tagged':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'status-change':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'location-change':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

export const EquipmentHistoryDialog: React.FC<EquipmentHistoryViewerProps> = ({
  equipment,
  isOpen,
  onClose
}) => {
  const { history, isLoading, error, refreshHistory } = useEquipmentHistory(equipment?.id);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && equipment) {
      refreshHistory();
    }
  }, [isOpen, equipment, refreshHistory]);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  if (!equipment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Package className="h-5 w-5" />
            Equipment History: {equipment.equipmentId}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Equipment Info Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{equipment.type || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Status</p>
                  <Badge variant={equipment.status === 'available' ? 'success' : 'secondary'}>
                    {equipment.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Location</p>
                  <p className="font-medium flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {equipment.locationId || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {equipment.createdAt ? format(new Date(equipment.createdAt), 'MMM d, yyyy') : 'Unknown'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* History Timeline */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">History Timeline</h3>
              <Button onClick={refreshHistory} variant="outline" size="sm">
                Refresh
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading history...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>Error loading history: {error}</p>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p>No history available</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {history.map((entry) => {
                    const isExpanded = expandedItems.has(entry.id);
                    
                    return (
                      <Card 
                        key={entry.id} 
                        className={`transition-all cursor-pointer hover:shadow-md ${getActionColor(entry.action)}`}
                        onClick={() => toggleExpanded(entry.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {getActionIcon(entry.action)}
                            
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium capitalize">
                                    {entry.action.replace('-', ' ')}
                                  </span>
                                  <ChevronRight 
                                    className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                                  />
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}
                                </span>
                              </div>

                              {isExpanded && (
                                <div className="mt-3 space-y-2 text-sm">
                                  {entry.fromStatus && entry.toStatus && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Status:</span>
                                      <Badge variant="outline">{entry.fromStatus}</Badge>
                                      <ChevronRight className="h-3 w-3" />
                                      <Badge variant="outline">{entry.toStatus}</Badge>
                                    </div>
                                  )}
                                  
                                  {entry.fromLocation && entry.toLocation && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Location:</span>
                                      <span>{entry.fromLocation}</span>
                                      <ChevronRight className="h-3 w-3" />
                                      <span>{entry.toLocation}</span>
                                    </div>
                                  )}
                                  
                                  {entry.jobName && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Job:</span>
                                      <span>{entry.jobName}</span>
                                    </div>
                                  )}
                                  
                                  {entry.userName && (
                                    <div className="flex items-center gap-2">
                                      <User className="h-3 w-3" />
                                      <span>{entry.userName}</span>
                                    </div>
                                  )}
                                  
                                  {entry.notes && (
                                    <div className="mt-2 p-2 bg-white/50 rounded">
                                      <p className="text-muted-foreground">Notes:</p>
                                      <p>{entry.notes}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, AlertTriangle, Wrench, Clock, CheckCircle } from 'lucide-react';
import { useUnifiedInventory } from '@/hooks/useUnifiedInventory';
import { toast } from 'sonner';

const MaintenanceSchedulePanel: React.FC = () => {
  const { data, updateEquipment } = useUnifiedInventory();
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Calculate maintenance needs based on equipment age and warranty
  const getMaintenanceItems = () => {
    return data.individualEquipment.map(equipment => {
      const now = new Date();
      const purchaseDate = equipment.purchaseDate || new Date();
      const warrantyExpiry = equipment.warrantyExpiry;
      const daysSincePurchase = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let maintenanceStatus = 'good';
      let nextMaintenanceDate = new Date();
      let priority = 'low';
      
      // Simple maintenance logic based on equipment age
      if (daysSincePurchase > 365) {
        maintenanceStatus = 'due';
        priority = 'high';
        nextMaintenanceDate = new Date(purchaseDate.getTime() + (365 * 24 * 60 * 60 * 1000));
      } else if (daysSincePurchase > 180) {
        maintenanceStatus = 'soon';
        priority = 'medium';
        nextMaintenanceDate = new Date(purchaseDate.getTime() + (365 * 24 * 60 * 60 * 1000));
      } else {
        nextMaintenanceDate = new Date(purchaseDate.getTime() + (365 * 24 * 60 * 60 * 1000));
      }

      // Check warranty status
      const warrantyStatus = warrantyExpiry && warrantyExpiry < now ? 'expired' : 'active';
      
      return {
        ...equipment,
        maintenanceStatus,
        nextMaintenanceDate,
        priority,
        warrantyStatus,
        daysSincePurchase
      };
    });
  };

  const maintenanceItems = getMaintenanceItems().filter(item => {
    if (filterStatus === 'all') return true;
    return item.maintenanceStatus === filterStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'due': return 'bg-red-100 text-red-800';
      case 'soon': return 'bg-yellow-100 text-yellow-800';
      case 'good': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleMarkMaintenance = async (equipmentId: string) => {
    try {
      await updateEquipment(equipmentId, {
        status: 'maintenance',
        notes: `Scheduled maintenance - ${new Date().toLocaleDateString()}`
      });
      toast.success('Equipment marked for maintenance');
    } catch (error) {
      toast.error('Failed to update equipment status');
    }
  };

  const getEquipmentTypeName = (typeId: string) => {
    const type = data.equipmentTypes.find(t => t.id === typeId);
    return type?.name || 'Unknown Type';
  };

  const getLocationName = (locationId: string) => {
    const location = data.storageLocations.find(l => l.id === locationId);
    return location?.name || 'Unknown Location';
  };

  const maintenanceStats = {
    due: maintenanceItems.filter(item => item.maintenanceStatus === 'due').length,
    soon: maintenanceItems.filter(item => item.maintenanceStatus === 'soon').length,
    good: maintenanceItems.filter(item => item.maintenanceStatus === 'good').length,
    expired: maintenanceItems.filter(item => item.warrantyStatus === 'expired').length
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Maintenance Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{maintenanceStats.due}</div>
            <div className="text-sm text-red-700">Due Now</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{maintenanceStats.soon}</div>
            <div className="text-sm text-yellow-700">Due Soon</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{maintenanceStats.good}</div>
            <div className="text-sm text-green-700">Up to Date</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{maintenanceStats.expired}</div>
            <div className="text-sm text-gray-700">Warranty Expired</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Equipment</SelectItem>
              <SelectItem value="due">Maintenance Due</SelectItem>
              <SelectItem value="soon">Due Soon</SelectItem>
              <SelectItem value="good">Up to Date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {maintenanceItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No equipment matching the selected filter</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Next Maintenance</TableHead>
                <TableHead>Warranty</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenanceItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.equipmentId} - {item.name}
                  </TableCell>
                  <TableCell>{getEquipmentTypeName(item.typeId)}</TableCell>
                  <TableCell>{getLocationName(item.locationId)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(item.maintenanceStatus)}>
                      {item.maintenanceStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(item.priority)}>
                      {item.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {item.nextMaintenanceDate.toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.warrantyExpiry ? (
                      <div className="flex items-center gap-1">
                        {item.warrantyStatus === 'expired' ? (
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                        ) : (
                          <Clock className="h-3 w-3 text-green-500" />
                        )}
                        {item.warrantyExpiry.toLocaleDateString()}
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {item.status !== 'maintenance' && item.maintenanceStatus === 'due' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkMaintenance(item.id)}
                      >
                        Schedule
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default MaintenanceSchedulePanel;

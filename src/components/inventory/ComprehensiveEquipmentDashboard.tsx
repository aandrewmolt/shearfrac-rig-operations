import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useInventory } from '@/contexts/InventoryContext';
import { useJobs } from '@/hooks/useJobs';
import { Package, MapPin, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const ComprehensiveEquipmentDashboard: React.FC = () => {
  const { data } = useInventory();
  const { jobs } = useJobs();
  const navigate = useNavigate();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Group equipment by job and type
  const equipmentByJob: Record<string, {
    jobName: string;
    equipment: any[];
  }> = {};

  // Initialize with all jobs
  jobs.forEach(job => {
    equipmentByJob[job.id] = {
      jobName: job.name,
      equipment: []
    };
  });

  // Add storage locations
  data.storageLocations.forEach(location => {
    equipmentByJob[location.id] = {
      jobName: location.name,
      equipment: []
    };
  });

  // Process individual equipment only
  data.individualEquipment.forEach(item => {
    const locationKey = item.locationId || 'unassigned';
    if (!equipmentByJob[locationKey]) {
      equipmentByJob[locationKey] = {
        jobName: 'Unassigned',
        equipment: []
      };
    }
    equipmentByJob[locationKey].equipment.push(item);
  });

  // Get equipment type details
  const getEquipmentType = (typeId: string) => {
    return data.equipmentTypes.find(t => t.id === typeId);
  };

  // Calculate totals
  const calculateTotals = () => {
    const totalEquipment = data.individualEquipment.length;
    const deployedEquipment = data.individualEquipment.filter(item => item.status === 'deployed').length;

    return { totalEquipment, deployedEquipment };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalEquipment}</div>
            <div className="text-xs text-muted-foreground">
              {totals.deployedEquipment} deployed
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.length}</div>
            <div className="text-xs text-muted-foreground">
              {jobs.filter(j => j.equipmentAllocated).length} with equipment
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Storage Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.storageLocations.length}</div>
            <div className="text-xs text-muted-foreground">
              {data.storageLocations.filter(l => l.isDefault).length} default
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Equipment by Location/Job */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location/Job</TableHead>
                <TableHead>Equipment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(equipmentByJob).map(([locationId, data]) => {
                const equipmentCount = data.equipment.length;
                
                if (equipmentCount === 0) return null;

                const isJob = jobs.some(j => j.id === locationId);
                
                return (
                  <TableRow key={locationId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="font-medium">{data.jobName}</span>
                        {isJob && <Badge variant="outline">Job</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        {/* Group by type */}
                        {Object.entries(
                          data.equipment.reduce((acc, item) => {
                            const type = getEquipmentType(item.typeId);
                            const typeName = type?.name || item.typeId;
                            if (!acc[typeName]) acc[typeName] = [];
                            acc[typeName].push(item);
                            return acc;
                          }, {} as Record<string, any[]>)
                        ).map(([typeName, items]) => (
                          <div key={typeName} className="border-l-2 border-gray-200 pl-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs">
                                {items.length}
                              </Badge>
                              <span className="font-medium text-sm">{typeName}</span>
                            </div>
                            {items.length <= 8 ? (
                              <div className="grid grid-cols-4 gap-1 max-w-md">
                                {items.map(i => (
                                  <span key={i.id} className="text-xs text-muted-foreground bg-gray-50 px-1 py-0.5 rounded">
                                    {i.equipmentId}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <Collapsible open={expandedRows.has(`${locationId}-${typeName}`)}>
                                <div className="grid grid-cols-4 gap-1 max-w-md">
                                  {items.slice(0, 8).map(i => (
                                    <span key={i.id} className="text-xs text-muted-foreground bg-gray-50 px-1 py-0.5 rounded">
                                      {i.equipmentId}
                                    </span>
                                  ))}
                                </div>
                                <CollapsibleContent>
                                  <div className="grid grid-cols-4 gap-1 max-w-md mt-1">
                                    {items.slice(8).map(i => (
                                      <span key={i.id} className="text-xs text-muted-foreground bg-gray-50 px-1 py-0.5 rounded">
                                        {i.equipmentId}
                                      </span>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-1 h-6 text-xs"
                                    onClick={() => {
                                      const key = `${locationId}-${typeName}`;
                                      const newExpanded = new Set(expandedRows);
                                      if (newExpanded.has(key)) {
                                        newExpanded.delete(key);
                                      } else {
                                        newExpanded.add(key);
                                      }
                                      setExpandedRows(newExpanded);
                                    }}
                                  >
                                    {expandedRows.has(`${locationId}-${typeName}`) ? (
                                      <>
                                        <ChevronUp className="h-3 w-3 mr-1" />
                                        Show less
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-3 w-3 mr-1" />
                                        Show {items.length - 8} more
                                      </>
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              </Collapsible>
                            )}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isJob && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/jobs?edit=${locationId}`)}
                        >
                          View Job
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
};

export default ComprehensiveEquipmentDashboard;
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock, AlertTriangle, Activity, Calendar, TrendingUp, 
  Play, Pause, AlertCircle, CheckCircle, History,
  BarChart3, Timer, Wrench, XCircle
} from 'lucide-react';
import { useEquipmentUsageTracking } from '@/hooks/equipment/useEquipmentUsageTracking';
import { useInventory } from '@/contexts/InventoryContext';
import { useJobs } from '@/hooks/useJobs';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface EquipmentUsageTrackerProps {
  equipmentId?: string;
  jobId?: string;
  showFullDashboard?: boolean;
}

export const EquipmentUsageTracker: React.FC<EquipmentUsageTrackerProps> = ({
  equipmentId,
  jobId,
  showFullDashboard = true
}) => {
  const { data: inventoryData } = useInventory();
  const { jobs } = useJobs();
  const {
    usageSessions,
    startUsageSession,
    endUsageSession,
    getEquipmentTotalHours,
    getEquipmentLifecycle,
    getJobUsageStats,
    getEquipmentStats,
    createRedTagEvent,
    getRedTagEvents,
    calculateHours
  } = useEquipmentUsageTracking();

  const [selectedEquipment, setSelectedEquipment] = useState<string>(equipmentId || '');
  const [selectedJob, setSelectedJob] = useState<string>(jobId || '');
  const [showRedTagDialog, setShowRedTagDialog] = useState(false);
  const [redTagReason, setRedTagReason] = useState('');
  const [redTagSeverity, setRedTagSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [activeTab, setActiveTab] = useState('overview');

  // Auto-track usage when equipment is deployed
  useEffect(() => {
    if (equipmentId && jobId) {
      const equipment = inventoryData.individualEquipment.find(e => e.id === equipmentId);
      const job = jobs.find(j => j.id === jobId);
      
      if (equipment?.status === 'deployed' && job?.start_date) {
        const existingSession = usageSessions.find(
          s => s.equipmentId === equipmentId && s.jobId === jobId && s.status === 'active'
        );
        
        if (!existingSession) {
          startUsageSession(equipmentId, jobId, new Date(job.start_date));
        }
      }
    }
  }, [equipmentId, jobId, inventoryData, jobs, usageSessions, startUsageSession]);

  const handleStartTracking = () => {
    if (!selectedEquipment || !selectedJob) {
      toast({
        title: "Error",
        description: "Please select equipment and job",
        variant: "destructive"
      });
      return;
    }
    startUsageSession(selectedEquipment, selectedJob);
  };

  const handleEndTracking = (eqId: string) => {
    endUsageSession(eqId);
  };

  const handleRedTag = () => {
    if (!selectedEquipment) {
      toast({
        title: "Error",
        description: "Please select equipment to red tag",
        variant: "destructive"
      });
      return;
    }
    setShowRedTagDialog(true);
  };

  const confirmRedTag = () => {
    if (!redTagReason) {
      toast({
        title: "Error",
        description: "Please provide a reason for red tagging",
        variant: "destructive"
      });
      return;
    }
    
    createRedTagEvent(selectedEquipment, redTagReason, redTagSeverity);
    setShowRedTagDialog(false);
    setRedTagReason('');
  };

  const equipmentLifecycle = selectedEquipment ? getEquipmentLifecycle(selectedEquipment) : null;
  const equipmentStats = selectedEquipment ? getEquipmentStats(selectedEquipment) : null;
  const jobStats = selectedJob ? getJobUsageStats(selectedJob) : null;
  const redTagEvents = getRedTagEvents();

  const activeEquipmentSessions = usageSessions.filter(s => s.status === 'active');

  if (!showFullDashboard && equipmentId) {
    // Simple view for equipment details
    const totalHours = getEquipmentTotalHours(equipmentId);
    const equipment = inventoryData.individualEquipment.find(e => e.id === equipmentId);
    
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Usage Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Hours</span>
            <Badge variant="outline">{totalHours.toFixed(1)} hrs</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Jobs Used</span>
            <Badge variant="outline">{equipmentLifecycle?.totalJobsUsed || 0}</Badge>
          </div>
          {equipment?.status === 'deployed' && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-500 animate-pulse" />
                <span>Currently tracking usage</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment Usage Tracking</CardTitle>
          <CardDescription>
            Track equipment usage hours, lifecycle, and maintenance events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Select Equipment</Label>
              <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose equipment" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryData.individualEquipment.map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>
                      <div className="flex items-center gap-2">
                        {eq.equipmentId} - {eq.name}
                        {eq.status === 'deployed' && (
                          <Badge variant="secondary" className="text-xs">In Use</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Select Job</Label>
              <Select value={selectedJob} onValueChange={setSelectedJob}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose job" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map(job => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.name} {job.client && `(${job.client})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={handleStartTracking} className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                Start Tracking
              </Button>
              <Button onClick={handleRedTag} variant="destructive">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Red Tag
              </Button>
            </div>
          </div>

          {/* Active Sessions */}
          {activeEquipmentSessions.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 animate-pulse" />
                Active Usage Sessions ({activeEquipmentSessions.length})
              </h4>
              <div className="space-y-2">
                {activeEquipmentSessions.map(session => {
                  const equipment = inventoryData.individualEquipment.find(e => e.id === session.equipmentId);
                  const currentHours = calculateHours(session.startTime);
                  
                  return (
                    <div key={session.id} className="flex items-center justify-between p-2 bg-white rounded">
                      <div className="flex items-center gap-3">
                        <Timer className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="text-sm font-medium">
                            {equipment?.equipmentId} on {session.jobName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Running for {currentHours.toFixed(1)} hours
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEndTracking(session.equipmentId)}
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        End
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
          <TabsTrigger value="job-usage">Job Usage</TabsTrigger>
          <TabsTrigger value="red-tags">Red Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {equipmentStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Utilization Rate</p>
                      <p className="text-2xl font-bold">{equipmentStats.utilizationRate}%</p>
                      <Progress value={equipmentStats.utilizationRate} className="mt-2" />
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Daily Average</p>
                      <p className="text-2xl font-bold">{equipmentStats.dailyAverage.toFixed(1)} hrs</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Weekly: {equipmentStats.weeklyAverage.toFixed(1)} hrs
                      </p>
                    </div>
                    <Activity className="h-8 w-8 text-blue-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Availability</p>
                      <p className="text-2xl font-bold">{equipmentStats.availability}%</p>
                      <Progress value={equipmentStats.availability} className="mt-2" />
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {equipmentStats?.peakUsagePeriod && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Peak Usage Period</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {format(equipmentStats.peakUsagePeriod.start, 'MMM d, yyyy')} - 
                      {format(equipmentStats.peakUsagePeriod.end, 'MMM d, yyyy')}
                    </p>
                    <p className="text-lg font-semibold">
                      {equipmentStats.peakUsagePeriod.hours.toFixed(1)} hours
                    </p>
                  </div>
                  <BarChart3 className="h-6 w-6 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="lifecycle" className="space-y-4">
          {equipmentLifecycle && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Equipment Lifecycle</CardTitle>
                  <CardDescription>
                    {equipmentLifecycle.equipmentName} ({equipmentLifecycle.equipmentId})
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Hours Used</p>
                      <p className="text-xl font-bold">{equipmentLifecycle.totalHoursUsed.toFixed(1)} hrs</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Jobs</p>
                      <p className="text-xl font-bold">{equipmentLifecycle.totalJobsUsed}</p>
                    </div>
                    {equipmentLifecycle.firstUseDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">First Use</p>
                        <p className="text-sm">{format(equipmentLifecycle.firstUseDate, 'MMM d, yyyy')}</p>
                      </div>
                    )}
                    {equipmentLifecycle.lastUseDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Last Use</p>
                        <p className="text-sm">{format(equipmentLifecycle.lastUseDate, 'MMM d, yyyy')}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">Current Status</h4>
                    <Badge 
                      variant={
                        equipmentLifecycle.currentStatus === 'available' ? 'default' :
                        equipmentLifecycle.currentStatus === 'deployed' ? 'secondary' :
                        equipmentLifecycle.currentStatus === 'maintenance' ? 'outline' :
                        'destructive'
                      }
                    >
                      {equipmentLifecycle.currentStatus}
                    </Badge>
                    {equipmentLifecycle.redTaggedDate && (
                      <div className="mt-2 text-sm text-red-600">
                        Red tagged on {format(equipmentLifecycle.redTaggedDate, 'MMM d, yyyy')}
                        {equipmentLifecycle.redTaggedReason && `: ${equipmentLifecycle.redTaggedReason}`}
                      </div>
                    )}
                  </div>

                  {/* Usage History */}
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">Recent Usage Sessions</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {equipmentLifecycle.usageSessions
                        .slice(-5)
                        .reverse()
                        .map(session => (
                          <div key={session.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div>
                              <p className="text-sm font-medium">{session.jobName}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(session.startTime, 'MMM d, yyyy HH:mm')}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                                {session.hoursUsed.toFixed(1)} hrs
                              </Badge>
                              {session.status === 'active' && (
                                <p className="text-xs text-blue-600 mt-1">Active</p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="job-usage" className="space-y-4">
          {jobStats && (
            <Card>
              <CardHeader>
                <CardTitle>Job Equipment Usage</CardTitle>
                <CardDescription>
                  {jobStats.jobName} - Total Duration: {jobStats.totalHours.toFixed(1)} hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {jobStats.equipment.map(eq => (
                    <div key={eq.equipmentId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{eq.equipmentName}</p>
                        <p className="text-sm text-muted-foreground">{eq.type}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={eq.status === 'active' ? 'default' : 'secondary'}>
                          {eq.hoursUsed.toFixed(1)} hrs
                        </Badge>
                        {eq.status === 'active' && <Clock className="h-4 w-4 text-blue-500 animate-pulse" />}
                        {eq.status === 'replaced' && (
                          <Badge variant="destructive">Replaced</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="red-tags" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Red Tag Events</CardTitle>
              <CardDescription>
                Equipment failures and maintenance events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {redTagEvents.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No red tag events recorded</p>
              ) : (
                <div className="space-y-3">
                  {redTagEvents.map(event => {
                    const equipment = inventoryData.individualEquipment.find(e => e.id === event.equipmentId);
                    return (
                      <div key={event.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{equipment?.equipmentId}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(event.taggedDate, 'MMM d, yyyy HH:mm')}
                            </p>
                            <p className="text-sm mt-1">{event.reason}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge 
                                variant={
                                  event.severity === 'critical' ? 'destructive' :
                                  event.severity === 'high' ? 'destructive' :
                                  event.severity === 'medium' ? 'outline' :
                                  'secondary'
                                }
                              >
                                {event.severity}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                After {event.hoursAtFailure.toFixed(1)} hours
                              </span>
                            </div>
                          </div>
                          {event.resolvedDate ? (
                            <Badge variant="default">Resolved</Badge>
                          ) : (
                            <Badge variant="destructive">Active</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Red Tag Dialog */}
      <Dialog open={showRedTagDialog} onOpenChange={setShowRedTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Red Tag Equipment</DialogTitle>
            <DialogDescription>
              Mark this equipment as requiring maintenance or repair
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason for Red Tag</Label>
              <Textarea
                value={redTagReason}
                onChange={(e) => setRedTagReason(e.target.value)}
                placeholder="Describe the issue..."
                rows={3}
              />
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={redTagSeverity} onValueChange={(v: any) => setRedTagSeverity(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Minor issue</SelectItem>
                  <SelectItem value="medium">Medium - Needs attention soon</SelectItem>
                  <SelectItem value="high">High - Critical issue</SelectItem>
                  <SelectItem value="critical">Critical - Immediate action required</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRedTagDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRedTag}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Confirm Red Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Cloud, CloudOff, RefreshCw, AlertCircle, Check } from 'lucide-react';
import edgeSync from '@/services/edgeFunctionSync';
import { toast } from 'sonner';

export function SyncStatusIndicator() {
  const [syncing, setSyncing] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  useEffect(() => {
    // Monitor online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check queue length periodically
    const interval = setInterval(() => {
      const queue = edgeSync.queue.getQueue();
      setQueueLength(queue.length);
    }, 5000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);
  
  const handleManualSync = async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }
    
    if (!edgeSync.isEnabled()) {
      toast.info('Edge sync is not configured');
      return;
    }
    
    setSyncing(true);
    try {
      const result = await edgeSync.queue.process();
      setLastSyncTime(new Date());
      
      if (result) {
        if (result.processed > 0) {
          toast.success(`Synced ${result.processed} item(s)`);
        } else {
          toast.info('Already up to date');
        }
        setQueueLength(result.remaining);
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
      toast.error('Sync failed. Items remain in queue.');
    } finally {
      setSyncing(false);
    }
  };
  
  // Don't show if edge sync is not configured
  if (!edgeSync.isEnabled()) {
    return null;
  }
  
  return (
    <div className="flex items-center gap-2">
      {/* Online/Offline Status */}
      <Badge variant={isOnline ? 'success' : 'secondary'} className="flex items-center gap-1">
        {isOnline ? (
          <>
            <Cloud className="h-3 w-3" />
            Online
          </>
        ) : (
          <>
            <CloudOff className="h-3 w-3" />
            Offline
          </>
        )}
      </Badge>
      
      {/* Queue Status */}
      {queueLength > 0 && (
        <Badge variant="warning" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {queueLength} pending
        </Badge>
      )}
      
      {/* Sync Button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={handleManualSync}
        disabled={syncing || !isOnline}
        className="h-8"
      >
        {syncing ? (
          <>
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Syncing...
          </>
        ) : queueLength > 0 ? (
          <>
            <RefreshCw className="h-3 w-3 mr-1" />
            Sync Now
          </>
        ) : (
          <>
            <Check className="h-3 w-3 mr-1" />
            Synced
          </>
        )}
      </Button>
      
      {/* Last Sync Time */}
      {lastSyncTime && (
        <span className="text-xs text-muted-foreground">
          Last sync: {lastSyncTime.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
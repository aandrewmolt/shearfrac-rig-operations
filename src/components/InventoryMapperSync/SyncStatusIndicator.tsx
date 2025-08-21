import React, { useEffect, useState } from 'react';
import { useInventoryMapperContext } from '@/contexts/InventoryMapperContext';
import { RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export const SyncStatusIndicator: React.FC = () => {
  const { syncStatus, lastSyncTime } = useInventoryMapperContext();
  const [timeSinceSync, setTimeSinceSync] = useState<string>('');

  useEffect(() => {
    const updateTimeSinceSync = () => {
      if (!lastSyncTime) {
        setTimeSinceSync('Never');
        return;
      }

      const now = new Date();
      const diff = now.getTime() - lastSyncTime.getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (hours > 0) {
        setTimeSinceSync(`${hours}h ago`);
      } else if (minutes > 0) {
        setTimeSinceSync(`${minutes}m ago`);
      } else {
        setTimeSinceSync(`${seconds}s ago`);
      }
    };

    updateTimeSinceSync();
    const interval = setInterval(updateTimeSinceSync, 1000);

    return () => clearInterval(interval);
  }, [lastSyncTime]);

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return 'Sync Error';
      default:
        return 'Synced';
    }
  };

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'text-blue-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-green-600';
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md">
      {getStatusIcon()}
      <div className="flex flex-col">
        <span className={`text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeSinceSync}
        </span>
      </div>
    </div>
  );
};
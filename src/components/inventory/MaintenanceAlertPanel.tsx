
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Shield } from 'lucide-react';

interface MaintenanceAlert {
  equipmentId: string;
  equipmentName: string;
  message: string;
  severity: 'warning' | 'error';
  type: 'warranty' | 'maintenance' | 'lifecycle';
}

interface MaintenanceAlertPanelProps {
  alerts: MaintenanceAlert[];
  maxDisplay?: number;
  compact?: boolean;
}

const MaintenanceAlertPanel: React.FC<MaintenanceAlertPanelProps> = ({
  alerts,
  maxDisplay = 5,
  compact = false,
}) => {
  const criticalAlerts = alerts.filter(alert => alert.severity === 'error');
  const warningAlerts = alerts.filter(alert => alert.severity === 'warning');

  const getIcon = (type: string) => {
    switch (type) {
      case 'warranty': return Shield;
      case 'maintenance': return Clock;
      default: return AlertTriangle;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warranty': return 'text-blue-600';
      case 'maintenance': return 'text-yellow-600';
      default: return 'text-red-600';
    }
  };

  if (alerts.length === 0 && !compact) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-green-600">
            ✓ No maintenance alerts
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayAlerts = alerts.slice(0, maxDisplay);

  return (
    <Card className={compact ? 'border-orange-200 bg-orange-50' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          Maintenance Alerts
          {criticalAlerts.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {criticalAlerts.length} Critical
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayAlerts.map((alert, index) => {
          const Icon = getIcon(alert.type);
          return (
            <div
              key={`${alert.equipmentId}-${index}`}
              className={`flex items-start gap-2 p-2 rounded text-sm ${
                alert.severity === 'error' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
              }`}
            >
              <Icon className={`h-4 w-4 mt-0.5 ${getTypeColor(alert.type)}`} />
              <div className="flex-1">
                <div className="font-medium">{alert.equipmentName}</div>
                <div className="text-xs text-gray-600">{alert.message}</div>
              </div>
              <Badge
                variant={alert.severity === 'error' ? 'destructive' : 'outline'}
                className="text-xs"
              >
                {alert.severity}
              </Badge>
            </div>
          );
        })}
        
        {alerts.length > maxDisplay && (
          <div className="text-center text-xs text-gray-500 pt-2">
            +{alerts.length - maxDisplay} more alerts
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MaintenanceAlertPanel;

import React from 'react';
import { Wrench, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function MaintenancePage() {
  const mockMaintenance = [
    { id: 1, equipment: 'HVAC System - Floor 3', priority: 'High', status: 'In Progress', assignedTo: 'John Smith', eta: '2 hours' },
    { id: 2, equipment: 'Elevator B', priority: 'Critical', status: 'Pending', assignedTo: 'Mike Johnson', eta: '1 hour' },
    { id: 3, equipment: 'MRI Machine', priority: 'Medium', status: 'Scheduled', assignedTo: 'Sarah Williams', eta: '4 hours' },
    { id: 4, equipment: 'Backup Generator', priority: 'Low', status: 'Completed', assignedTo: 'David Brown', eta: 'Completed' },
    { id: 5, equipment: 'Water Heater - West Wing', priority: 'High', status: 'In Progress', assignedTo: 'John Smith', eta: '3 hours' },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-600';
      case 'High': return 'bg-orange-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'In Progress': return <Wrench className="h-3 w-3" />;
      case 'Pending': return <AlertTriangle className="h-3 w-3" />;
      case 'Scheduled': return <Clock className="h-3 w-3" />;
      case 'Completed': return <CheckCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress': return 'text-blue-600 bg-blue-50';
      case 'Pending': return 'text-red-600 bg-red-50';
      case 'Scheduled': return 'text-yellow-600 bg-yellow-50';
      case 'Completed': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Summary Stats */}
      <div className="p-4 border-b" style={{ borderColor: 'hsl(var(--border-light))' }}>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div>
            <p className="text-muted-foreground">Critical</p>
            <p className="text-lg font-bold text-red-600">1</p>
          </div>
          <div>
            <p className="text-muted-foreground">In Progress</p>
            <p className="text-lg font-bold text-blue-600">2</p>
          </div>
          <div>
            <p className="text-muted-foreground">Scheduled</p>
            <p className="text-lg font-bold text-yellow-600">1</p>
          </div>
          <div>
            <p className="text-muted-foreground">Completed</p>
            <p className="text-lg font-bold text-green-600">1</p>
          </div>
        </div>
      </div>

      {/* Maintenance List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {mockMaintenance.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-sm font-semibold mb-1">{item.equipment}</CardTitle>
                  <div className="flex gap-2 items-center">
                    <Badge className={`${getPriorityColor(item.priority)} text-white text-xs`}>
                      {item.priority}
                    </Badge>
                    <Badge variant="outline" className={`${getStatusColor(item.status)} text-xs flex items-center gap-1`}>
                      {getStatusIcon(item.status)}
                      {item.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Assigned to:</span>
                  <p className="font-medium">{item.assignedTo}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">ETA:</span>
                  <p className="font-medium">{item.eta}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


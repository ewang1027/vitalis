import React from 'react';
import { RoomDetail } from '@/data/mockRoomDetails';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  User,
  Stethoscope,
  Activity,
  AlertCircle,
  Package,
  Calendar,
  Phone,
  Heart,
  Thermometer,
  Wind,
  Droplets,
  Eye,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RoomInfoModalProps {
  room: RoomDetail | null;
  open: boolean;
  onClose: () => void;
  onEnterRoom: () => void;
}

export function RoomInfoModal({ room, open, onClose, onEnterRoom }: RoomInfoModalProps) {
  if (!room) return null;

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'moderate':
        return 'bg-yellow-500';
      case 'stable':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied':
        return 'bg-blue-500';
      case 'available':
        return 'bg-green-500';
      case 'cleaning':
        return 'bg-yellow-500';
      case 'maintenance':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">{room.roomName}</DialogTitle>
            <Badge className={getStatusColor(room.status)}>
              {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          {/* Patient Information */}
          {room.patient && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <h3 className="font-semibold text-sm">Patient</h3>
                <Badge className={`${getSeverityColor(room.patient.severity)} text-xs`}>
                  {room.patient.severity}
                </Badge>
              </div>
              <div className="text-sm">
                <p className="font-medium">{room.patient.name}</p>
                <p className="text-muted-foreground text-xs">{room.patient.condition}</p>
              </div>
            </div>
          )}

          {/* Vitals */}
          {room.vitals && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <h3 className="font-semibold text-sm">Vitals</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Heart Rate</p>
                  <p className="font-medium">{room.vitals.heartRate} bpm</p>
                </div>
                <div>
                  <p className="text-muted-foreground">O2 Sat</p>
                  <p className="font-medium">{room.vitals.oxygenSaturation}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">BP</p>
                  <p className="font-medium">{room.vitals.bloodPressure}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Temp</p>
                  <p className="font-medium">{room.vitals.temperature}°F</p>
                </div>
              </div>
            </div>
          )}

          {/* Doctor */}
          {room.doctor && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                <h3 className="font-semibold text-sm">Doctor</h3>
              </div>
              <p className="text-sm font-medium">{room.doctor.name}</p>
              <p className="text-xs text-muted-foreground">{room.doctor.specialty}</p>
            </div>
          )}

          {/* Equipment Count */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="font-medium">Equipment</span>
            </div>
            <span className="text-muted-foreground">{room.equipment.length} items</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button onClick={onEnterRoom} className="flex-1" size="sm">
            <Eye className="mr-2 h-4 w-4" />
            Enter Room
          </Button>
          <Button variant="outline" onClick={onClose} size="sm">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

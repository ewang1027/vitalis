import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Stethoscope, FileText, MapPin, ArrowRight, X } from 'lucide-react';

interface RoomInfoPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: {
    id: string;
    room_name?: string | null;
    room_number?: string | null;
    status?: string | null;
  };
  patient?: {
    name: string;
    condition?: string | null;
    severity?: string | null;
  } | null;
  doctor?: {
    name: string;
    specialization?: string | null;
  } | null;
  onEnterRoom: () => void;
  position?: { x: number; y: number } | null;
}

export function RoomInfoPopup({
  open,
  onOpenChange,
  room,
  patient,
  doctor,
  onEnterRoom,
  position,
}: RoomInfoPopupProps) {
  if (!open) return null;

  const roomName = room.room_name || room.room_number || `Room ${room.id}`;

  const getStatusColor = (status?: string | null) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === 'ready' || statusLower === 'available') return 'text-green-600';
    if (statusLower === 'occupied' || statusLower === 'in-use') return 'text-yellow-600';
    if (statusLower === 'cleaning' || statusLower === 'maintenance') return 'text-red-600';
    return 'text-gray-600';
  };

  const getSeverityColor = (severity?: string | null) => {
    const severityLower = severity?.toLowerCase();
    if (severityLower === 'critical') return 'text-red-600 font-semibold';
    if (severityLower === 'moderate') return 'text-yellow-600 font-medium';
    if (severityLower === 'stable') return 'text-green-600';
    return 'text-gray-600';
  };

  // Calculate safe position that stays within viewport bounds
  const getSafePosition = () => {
    if (!position) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    
    // Estimate popup height (approximate)
    const popupHeight = 280;
    const minTopMargin = 20;
    
    let adjustedY = position.y;
    let yOffset = -70; // Reduced from -120% to -70% to bring it down
    
    // If popup would go above screen, clamp it
    if (position.y - popupHeight < minTopMargin) {
      adjustedY = Math.max(position.y, popupHeight / 2 + minTopMargin);
      yOffset = -50; // Center it vertically if near top
    }
    
    return {
      top: `${adjustedY}px`,
      left: `${position.x}px`,
      transform: `translate(-50%, ${yOffset}%)`,
    };
  };

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={getSafePosition()}
    >
      <Card className="w-80 shadow-2xl border-2 pointer-events-auto bg-background/98 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-blue-600" />
              {roomName}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">Status:</span>
            <span className={`text-xs font-medium ${getStatusColor(room.status)}`}>
              {room.status || 'Unknown'}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pb-3">
          {/* Patient Info */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <User className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs font-semibold">Patient</span>
            </div>
            {patient ? (
              <div className="space-y-1 ml-5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{patient.name}</span>
                </div>
                {patient.condition && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Condition:</span>
                    <span className="text-xs">{patient.condition}</span>
                  </div>
                )}
                {patient.severity && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Severity:</span>
                    <span className={`${getSeverityColor(patient.severity)}`}>
                      {patient.severity}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground ml-5">No patient assigned</p>
            )}
          </div>

          {/* Doctor Info */}
          <div className="border-t pt-2">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs font-semibold">Doctor</span>
            </div>
            {doctor ? (
              <div className="space-y-1 ml-5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{doctor.name}</span>
                </div>
                {doctor.specialization && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Specialty:</span>
                    <span className="text-xs">{doctor.specialization}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground ml-5">No doctor assigned</p>
            )}
          </div>

          {/* Enter Room Button */}
          <div className="pt-2">
            <Button onClick={onEnterRoom} size="sm" className="w-full gap-2">
              Enter Room
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

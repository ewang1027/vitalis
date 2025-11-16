import React from 'react';
import { MapPin, Compass, Building } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function LocationsPage() {
  const mockLocations = [
    { id: 1, name: 'Emergency Department', floor: 1, capacity: '24 beds', status: 'Active', occupancy: '18/24' },
    { id: 2, name: 'Intensive Care Unit', floor: 3, capacity: '12 beds', status: 'Active', occupancy: '10/12' },
    { id: 3, name: 'Operating Rooms', floor: 2, capacity: '8 rooms', status: 'Active', occupancy: '5/8' },
    { id: 4, name: 'Radiology', floor: 1, capacity: '6 rooms', status: 'Active', occupancy: '4/6' },
    { id: 5, name: 'Pediatrics Ward', floor: 4, capacity: '20 beds', status: 'Active', occupancy: '15/20' },
    { id: 6, name: 'Maternity Ward', floor: 3, capacity: '16 beds', status: 'Active', occupancy: '12/16' },
  ];

  const getOccupancyLevel = (occupancy: string) => {
    const [current, total] = occupancy.split('/').map(Number);
    const percentage = (current / total) * 100;
    if (percentage >= 90) return 'High';
    if (percentage >= 60) return 'Medium';
    return 'Low';
  };

  const getOccupancyColor = (occupancy: string) => {
    const level = getOccupancyLevel(occupancy);
    if (level === 'High') return 'bg-red-500';
    if (level === 'Medium') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header Stats */}
      <div className="p-4 border-b" style={{ borderColor: 'hsl(var(--border-light))' }}>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Total Floors</p>
            <p className="text-lg font-bold">4</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Departments</p>
            <p className="text-lg font-bold">6</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Capacity</p>
            <p className="text-lg font-bold">86</p>
          </div>
        </div>
      </div>

      {/* Locations List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {mockLocations.map((location) => (
          <Card key={location.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-sm font-semibold">{location.name}</CardTitle>
                </div>
                <Badge className={`${getOccupancyColor(location.occupancy)} text-white text-xs`}>
                  {getOccupancyLevel(location.occupancy)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Compass className="h-3 w-3 text-gray-400" />
                  <span className="text-muted-foreground">Floor:</span>
                  <p className="font-medium">{location.floor}</p>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-gray-400" />
                  <span className="text-muted-foreground">Capacity:</span>
                  <p className="font-medium">{location.capacity}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Occupancy:</span>
                  <p className="font-medium">{location.occupancy}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


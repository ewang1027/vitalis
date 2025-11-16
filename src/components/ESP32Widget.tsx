import { useESP32Data } from '@/hooks/useESP32Data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Thermometer, Droplets, Battery } from 'lucide-react';

export function ESP32Widget() {
  const { data, isConnected } = useESP32Data();

  return (
    <Card className="w-64 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white">ESP32 Monitor</CardTitle>
          {isConnected ? (
            <Badge variant="default" className="bg-green-500 flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              Live
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1 text-white">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {data ? (
          <>
            {data.temperature !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-orange-500" />
                  <span className="text-white">Temp</span>
                </div>
                <span className="font-semibold text-white">{data.temperature.toFixed(1)}°C</span>
              </div>
            )}
            {data.humidity !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <span className="text-white">Humidity</span>
                </div>
                <span className="font-semibold text-white">{data.humidity.toFixed(1)}%</span>
              </div>
            )}
            {data.batteryLevel !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Battery className="h-4 w-4 text-green-500" />
                  <span className="text-white">Battery</span>
                </div>
                <span className="font-semibold text-white">{data.batteryLevel.toFixed(0)}%</span>
              </div>
            )}
            {data.deviceId && (
              <div className="text-xs text-white pt-2 border-t">
                Device: {data.deviceId.slice(-8)}
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-white text-center py-2">
            {isConnected ? 'Waiting for data...' : 'Connect ESP32 to see data'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

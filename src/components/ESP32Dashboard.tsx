import { useESP32Data } from '@/hooks/useESP32Data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Thermometer,
  Droplets,
  Gauge,
  Sun,
  Activity,
  Battery,
  Wifi,
  WifiOff,
} from 'lucide-react';

export function ESP32Dashboard() {
  const { data, isConnected, history, error } = useESP32Data();

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getSensorValue = (
    value: number | undefined,
    unit: string
  ): string => {
    return value !== undefined ? `${value.toFixed(2)} ${unit}` : 'N/A';
  };

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ESP32 Hardware Monitor</h1>
          <p className="text-muted-foreground">
            Real-time sensor data from your ESP32 device
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi className="h-5 w-5 text-green-500" />
              <Badge variant="default" className="bg-green-500">
                Connected
              </Badge>
            </>
          ) : (
            <>
              <WifiOff className="h-5 w-5 text-red-500" />
              <Badge variant="destructive">Disconnected</Badge>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-500">
          <CardContent className="pt-6">
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Current Data */}
      {data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Temperature */}
            {data.temperature !== undefined && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Temperature
                  </CardTitle>
                  <Thermometer className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {getSensorValue(data.temperature, '°C')}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last update: {formatTimestamp(data.timestamp)}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Humidity */}
            {data.humidity !== undefined && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Humidity
                  </CardTitle>
                  <Droplets className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {getSensorValue(data.humidity, '%')}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last update: {formatTimestamp(data.timestamp)}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Pressure */}
            {data.pressure !== undefined && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pressure
                  </CardTitle>
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {getSensorValue(data.pressure, 'hPa')}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last update: {formatTimestamp(data.timestamp)}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Light */}
            {data.light !== undefined && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Light Level
                  </CardTitle>
                  <Sun className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {getSensorValue(data.light, 'lux')}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last update: {formatTimestamp(data.timestamp)}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Motion */}
            {data.motion !== undefined && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Motion</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data.motion ? 'Detected' : 'None'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last update: {formatTimestamp(data.timestamp)}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Battery Level */}
            {data.batteryLevel !== undefined && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Battery Level
                  </CardTitle>
                  <Battery className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {getSensorValue(data.batteryLevel, '%')}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last update: {formatTimestamp(data.timestamp)}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Custom Sensors */}
          {data.customSensors &&
            Object.keys(data.customSensors).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Custom Sensors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(data.customSensors).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="flex flex-col space-y-1 p-3 border rounded-lg"
                        >
                          <span className="text-sm font-medium capitalize">
                            {key}
                          </span>
                          <span className="text-xl font-bold">
                            {typeof value === 'number'
                              ? value.toFixed(2)
                              : String(value)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Device Info */}
          {data.deviceId && (
            <Card>
              <CardHeader>
                <CardTitle>Device Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Device ID:</span>
                    <span className="font-mono">{data.deviceId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Last Update:
                    </span>
                    <span>{formatTimestamp(data.timestamp)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      History Count:
                    </span>
                    <span>{history.length} readings</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {isConnected
                ? 'Waiting for data from ESP32...'
                : 'Connecting to server...'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

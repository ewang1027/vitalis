# ESP32 Hardware Integration Guide

This guide explains how to send hardware data from your ESP32 to the application and display it in real-time.

## Architecture Overview

```
ESP32 Device → HTTP POST → Express Server → WebSocket → React Dashboard
```

1. **ESP32** sends sensor data via HTTP POST to the Express server
2. **Express Server** receives the data and broadcasts it to all connected WebSocket clients
3. **React Dashboard** displays the data in real-time through WebSocket connection

## Quick Start

### Start Everything with One Command

```bash
npm run dev
```

This single command starts both:
- **Backend Server** (port 3001) - Receives data from ESP32 and broadcasts via WebSocket
- **Frontend** (port 5173) - React app with real-time dashboard

The server provides:
- HTTP endpoint: `POST /api/hardware` - Receives data from ESP32
- WebSocket: `ws://localhost:3001` - Streams real-time updates to frontend
- Health check: `GET /api/health` - Server status

### Individual Commands (Optional)

If you need to run them separately:
```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend
```

## Frontend Integration

### Adding the Dashboard to Your App

Add the ESP32Dashboard component to any page:

```tsx
import { ESP32Dashboard } from '@/components/ESP32Dashboard';

function MyPage() {
  return (
    <div>
      <ESP32Dashboard />
    </div>
  );
}
```

### Using the Hook Directly

If you want to create a custom UI, use the `useESP32Data` hook:

```tsx
import { useESP32Data } from '@/hooks/useESP32Data';

function CustomComponent() {
  const { data, isConnected, history, error } = useESP32Data();

  return (
    <div>
      {isConnected ? 'Connected' : 'Disconnected'}
      {data && <p>Temperature: {data.temperature}°C</p>}
    </div>
  );
}
```

## ESP32 Setup

### 1. Install Arduino Libraries

Install the following library via Arduino Library Manager:
- **ArduinoJson** by Benoit Blanchon

### 2. Configure the Code

Edit `ESP32_Example.ino`:

```cpp
// Update these values
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://YOUR_COMPUTER_IP:3001/api/hardware";
```

To find your computer's IP address:
- **Windows**: Run `ipconfig` and look for IPv4 Address
- **Mac/Linux**: Run `ifconfig` or `ip addr`

### 3. Upload to ESP32

1. Connect your ESP32 via USB
2. Select the correct board and port in Arduino IDE
3. Upload the code

## Data Format

### ESP32 to Server (HTTP POST to `/api/hardware`)

```json
{
  "deviceId": "AA:BB:CC:DD:EE:FF",
  "temperature": 25.5,
  "humidity": 60.0,
  "pressure": 1013.25,
  "light": 500,
  "motion": false,
  "batteryLevel": 85.5,
  "customSensors": {
    "signal_strength": -45,
    "uptime": 3600
  }
}
```

All fields except `deviceId` are optional. The server will automatically add a `timestamp`.

### Server to Frontend (WebSocket)

```json
{
  "type": "hardware_update",
  "data": {
    "deviceId": "AA:BB:CC:DD:EE:FF",
    "timestamp": 1699564800000,
    "temperature": 25.5,
    "humidity": 60.0,
    "pressure": 1013.25,
    "light": 500,
    "motion": false,
    "batteryLevel": 85.5,
    "customSensors": {
      "signal_strength": -45,
      "uptime": 3600
    }
  }
}
```

## Testing Without ESP32

You can test the system without an ESP32 using curl or any HTTP client:

```bash
curl -X POST http://localhost:3001/api/hardware \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "TEST_DEVICE",
    "temperature": 23.5,
    "humidity": 55,
    "light": 300,
    "motion": true,
    "batteryLevel": 95
  }'
```

Or using PowerShell on Windows:

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/hardware" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"deviceId":"TEST_DEVICE","temperature":23.5,"humidity":55,"light":300,"motion":true,"batteryLevel":95}'
```

## Supported Sensors

The dashboard automatically displays:
- **Temperature** (°C)
- **Humidity** (%)
- **Pressure** (hPa)
- **Light** (lux)
- **Motion** (boolean)
- **Battery Level** (%)
- **Custom Sensors** (any key-value pairs)

## Customization

### Adding Custom Sensors

On the ESP32 side, add custom sensors to the `customSensors` object:

```cpp
JsonObject customSensors = doc.createNestedObject("customSensors");
customSensors["soil_moisture"] = readSoilMoisture();
customSensors["air_quality"] = readAirQuality();
```

The dashboard will automatically display them in the "Custom Sensors" section.

### Modifying the Update Interval

Change the `UPDATE_INTERVAL` constant in the ESP32 code:

```cpp
const unsigned long UPDATE_INTERVAL = 2000; // milliseconds
```

### Changing the Server Port

1. Update `server/index.ts`:
```typescript
const PORT = process.env.PORT || 3001; // Change to your desired port
```

2. Update `src/services/esp32WebSocket.ts`:
```typescript
constructor(url: string = 'ws://localhost:3001') // Update port here
```

3. Update your ESP32 code:
```cpp
const char* serverUrl = "http://YOUR_COMPUTER_IP:NEW_PORT/api/hardware";
```

## Troubleshooting

### ESP32 Can't Connect to Server
- Ensure ESP32 and computer are on the same network
- Check firewall settings - port 3001 must be open
- Verify the IP address in the ESP32 code is correct
- Check Serial Monitor for error messages

### WebSocket Not Connecting
- Make sure the server is running (`npm run server`)
- Check browser console for connection errors
- Verify the WebSocket URL in `esp32WebSocket.ts`

### No Data Showing
- Check if ESP32 is successfully sending data (Serial Monitor)
- Verify the server is receiving data (server console logs)
- Check browser console for errors
- Ensure WebSocket connection is established (check connection badge)

## Advanced Features

### History Tracking

The `useESP32Data` hook maintains a history of readings:

```tsx
const { history } = useESP32Data(100); // Keep last 100 readings
```

You can use this to create charts or analyze trends.

### Multiple Devices

The server supports multiple ESP32 devices. Each device should have a unique `deviceId`. You can extend the frontend to filter/display data per device.

## API Reference

### HTTP Endpoints

#### POST /api/hardware
Receive hardware data from ESP32.

**Request Body:**
```json
{
  "deviceId": "string (optional)",
  "temperature": "number (optional)",
  "humidity": "number (optional)",
  "pressure": "number (optional)",
  "light": "number (optional)",
  "motion": "boolean (optional)",
  "batteryLevel": "number (optional)",
  "customSensors": "object (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Hardware data received and broadcasted",
  "timestamp": 1699564800000
}
```

#### GET /api/health
Check server health and connected clients.

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1699564800000,
  "connectedClients": 2
}
```

### WebSocket Messages

#### Connection Message
```json
{
  "type": "connection",
  "message": "Connected to ESP32 hardware data stream",
  "timestamp": 1699564800000
}
```

#### Hardware Update
```json
{
  "type": "hardware_update",
  "data": { /* ESP32HardwareData */ },
  "timestamp": 1699564800000
}
```

#### Error Message
```json
{
  "type": "error",
  "message": "Error description",
  "timestamp": 1699564800000
}
```

## Next Steps

- Implement data persistence (database)
- Add historical data visualization (charts)
- Create alerts/notifications for threshold values
- Add device management (multiple devices)
- Implement authentication for production use

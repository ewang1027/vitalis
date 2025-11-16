# ESP32 Quick Start Guide for Hardware Team

## Getting Started in 3 Steps

### 1. Start the Application (Software Team Has This Ready!)

```bash
npm run dev
```

That's it! Both the backend server and frontend are now running:
- Backend API: http://localhost:3001
- Frontend Dashboard: http://localhost:5173

### 2. Find Your Computer's IP Address

Your ESP32 needs to connect to your computer. Find your local IP:

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" (example: 192.168.1.100)

**Mac/Linux:**
```bash
ifconfig
# or
ip addr
```
Look for your local network IP (starts with 192.168.x.x or 10.x.x.x)

### 3. Configure Your ESP32

Open `ESP32_Example.ino` and update these three lines:

```cpp
const char* ssid = "YOUR_WIFI_NAME";           // Your WiFi network name
const char* password = "YOUR_WIFI_PASSWORD";    // Your WiFi password
const char* serverUrl = "http://192.168.1.100:3001/api/hardware";  // Your computer's IP
```

**Important:**
- ESP32 and your computer must be on the same WiFi network
- Replace `192.168.1.100` with YOUR computer's IP address
- Keep the `:3001/api/hardware` part

## Testing Your Setup

### Test Without ESP32 First

Before connecting hardware, verify the system works:

**Windows (PowerShell):**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/hardware" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"deviceId":"TEST","temperature":25.5,"humidity":60,"light":500}'
```

**Mac/Linux:**
```bash
curl -X POST http://localhost:3001/api/hardware \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"TEST","temperature":25.5,"humidity":60,"light":500}'
```

If it works, you'll see the data appear on the dashboard at http://localhost:5173

## ESP32 Data Format

Your ESP32 should send JSON data via HTTP POST to `http://YOUR_COMPUTER_IP:3001/api/hardware`

### Minimum Example

```json
{
  "deviceId": "ESP32_001",
  "temperature": 25.5
}
```

### Full Example with All Sensors

```json
{
  "deviceId": "ESP32_001",
  "temperature": 25.5,
  "humidity": 60.0,
  "pressure": 1013.25,
  "light": 500,
  "motion": false,
  "batteryLevel": 85.5,
  "customSensors": {
    "soil_moisture": 45,
    "air_quality": 95
  }
}
```

**All fields are optional except what you want to track!**

## Arduino Code Template

The `ESP32_Example.ino` file has everything you need. Here's the key function:

```cpp
void sendHardwareData() {
  HTTPClient http;
  StaticJsonDocument<512> doc;

  // Add your sensor readings
  doc["deviceId"] = WiFi.macAddress();
  doc["temperature"] = readTemperature();  // Replace with actual sensor read
  doc["humidity"] = readHumidity();        // Replace with actual sensor read

  // Send to server
  String jsonString;
  serializeJson(doc, jsonString);

  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  int httpResponseCode = http.POST(jsonString);

  http.end();
}
```

## Required Arduino Library

Install via Arduino Library Manager:
- **ArduinoJson** by Benoit Blanchon

## Troubleshooting

### ESP32 Can't Connect to WiFi
1. Double-check WiFi name and password
2. Make sure you're using 2.4GHz WiFi (ESP32 doesn't support 5GHz)
3. Check Serial Monitor for error messages

### ESP32 Can't Reach Server
1. Verify your computer's firewall allows port 3001
2. Make sure `npm run dev` is running
3. Ping your computer from another device to verify network connectivity
4. Confirm ESP32 and computer are on the same network

### Data Not Showing on Dashboard
1. Check Serial Monitor - is ESP32 getting HTTP 200 response?
2. Check backend console - is it receiving the data?
3. Check frontend console for WebSocket connection errors
4. Verify dashboard is open at http://localhost:5173

### Firewall Issues (Windows)
If ESP32 can't connect, you may need to allow Node.js through Windows Firewall:
1. Search "Windows Defender Firewall"
2. Click "Allow an app through firewall"
3. Find "Node.js" and enable both Private and Public networks

## Viewing the Dashboard

Open your browser to: **http://localhost:5173**

You should see:
- Connection status (green badge when connected)
- Real-time sensor values updating automatically
- Device information
- History of readings

## Next Steps

1. Start with the example code to verify connectivity
2. Replace the simulated sensor readings with real sensor code
3. Add any custom sensors you need
4. Adjust the update interval (default: 2 seconds)

## Getting Help

- Full documentation: `ESP32_INTEGRATION.md`
- Backend code: `server/index.ts`
- Frontend code: `src/components/ESP32Dashboard.tsx`
- Arduino example: `ESP32_Example.ino`

## Tips for Hardware Team

- **Start simple:** Get basic temperature/humidity working first
- **Use Serial Monitor:** Print debug info to see what's happening
- **Check HTTP response:** 200 = success, anything else = problem
- **Test incrementally:** Add sensors one at a time
- **Battery power:** Lower update frequency to save power (change `UPDATE_INTERVAL`)

Good luck! The software side is ready for your data! 🚀

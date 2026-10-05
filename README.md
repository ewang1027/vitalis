# Vitalis

An operations dashboard for nursing facilities: a 3D ward map, patient and room status, a task queue, and a chat agent that can check patients in and out. Built at HackNYU 2025 (24 hours), where it was the 1st Overall Winner in the Healthcare track. The ESP32 firmware in `firmware/` and the end-to-end sensor wiring were finished after the hackathon. Forked from [SupratikPanuganti/HackNYU](https://github.com/SupratikPanuganti/HackNYU).

## How it works

- **Frontend**: Vite, React, TypeScript, Tailwind and shadcn/ui. The ward map is react-three-fiber. It reads and writes Supabase directly with the anon key.
- **Agent**: the chat calls OpenRouter from the browser with tool calling (check in, discharge, create task, get room context). The tools read and write Supabase.
- **Sensor server** (`server/index.ts`): Express plus `ws` on port 3001. The ESP32 POSTs a reading to `/api/hardware` every 2 seconds, and the server pushes it to the dashboard over a WebSocket on the same port. The 3D room view shows those readings as Live and goes back to simulated values if nothing arrives for 10 seconds.
- **Vitals**: patient vitals come from the Supabase `vitals` table and are simulated when there's no recent row. No sensor writes to that table yet.

The Supabase schema isn't in this repo. The tables the app expects are typed in `src/lib/supabase.ts`.

## Running it

```bash
npm install
npm run dev        # Vite on :8080 and the sensor server on :3001
```

Create a `.env` first:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_OPENROUTER_API_KEY=...
```

The OpenRouter key ends up in the frontend bundle, so don't host a build with a key you care about.

To test the sensor path without hardware:

```bash
curl -X POST localhost:3001/api/hardware -H "Content-Type: application/json" \
  -d '{"deviceId":"TEST","temperature":22.4,"humidity":48,"light":400,"motion":false,"customSensors":{"distance":65,"inBed":true}}'
```

`amplify.yml` builds the static frontend on AWS Amplify. The sensor server isn't part of that deploy, and the dashboard looks for it at `ws://localhost:3001`.

## Firmware

A PlatformIO project for an ESP32 DevKit v1 that acts as a room sensor node. Every 2 seconds it sends temperature, humidity, light, motion, and bed distance / in-bed to the sensor server. Fields from a failed sensor read are left out.

| Part | ESP32 pin | Notes |
| --- | --- | --- |
| DHT22 (temp, humidity) | GPIO 4 | 10k pull-up to 3V3 if the board doesn't have one |
| HC-SR501 PIR | GPIO 26 | Power from 5V (VIN) |
| LDR + 10k resistor | GPIO 35 | 3V3, LDR, GPIO 35, 10k, GND. Lux is approximate |
| HC-SR04 TRIG / ECHO | GPIO 19 / GPIO 18 | Power from 5V, put ECHO through a 1k/2k divider |

The HC-SR04 is pointed at the mattress. Under 100 cm counts as in bed.

```bash
cd firmware
cp include/secrets.h.example include/secrets.h   # WiFi and the server's LAN address
pio run -e esp32dev -t upload
pio device monitor
```

`pio run -e esp32dev-sim -t upload` builds a version that sends simulated readings (tagged `simulated: true`) so you can test with a bare board. The ESP32 only joins 2.4 GHz networks, and it has to reach port 3001 on the machine running `npm run dev`.

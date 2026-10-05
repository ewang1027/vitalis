// Vitalis room sensor node.
//
// Reads the room sensors and POSTs one JSON reading every 2 seconds to the
// Express server (server/index.ts, POST /api/hardware). The server adds a
// timestamp and broadcasts it to the dashboard over WebSocket as
// {"type": "hardware_update", "data": ...}. The 3D room view
// (src/hooks/useRoomEnvironment.ts) uses temperature, humidity, light, motion,
// customSensors.distance and customSensors.inBed, and switches back to its own
// simulation if nothing arrives for 10 seconds.
//
// Payload:
// {
//   "deviceId": "AA:BB:CC:DD:EE:FF",
//   "temperature": 22.4,          deg C (DHT22)
//   "humidity": 48.1,             %RH (DHT22)
//   "light": 412,                 lux, approximate (LDR divider)
//   "motion": false,              PIR, true if triggered since the last send
//   "customSensors": {
//     "distance": 63.5,           cm (HC-SR04 pointed at the bed)
//     "inBed": true,              distance < IN_BED_MAX_CM
//     "signal_strength": -58,     WiFi RSSI, dBm
//     "uptime": 1234              seconds since boot
//   }
// }
// A field is left out when its sensor read fails, so the app never gets a
// made-up number from a disconnected sensor.

#include <Arduino.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <math.h>

#if __has_include("secrets.h")
#include "secrets.h"
#else
#error "Missing include/secrets.h. Copy include/secrets.h.example to include/secrets.h and fill it in."
#endif

#ifndef SIMULATE_SENSORS
#define SIMULATE_SENSORS 0
#endif

// Pins (ESP32 DevKit v1)
constexpr uint8_t DHT_PIN = 4;    // DHT22 data, 10k pull-up to 3V3
constexpr uint8_t PIR_PIN = 26;   // HC-SR501 OUT
constexpr uint8_t LDR_PIN = 35;   // LDR divider midpoint (ADC1, input only)
constexpr uint8_t TRIG_PIN = 19;  // HC-SR04 TRIG
constexpr uint8_t ECHO_PIN = 18;  // HC-SR04 ECHO through a 5V to 3.3V divider

constexpr uint32_t SEND_INTERVAL_MS = 2000;  // the app marks data stale after 10 s
constexpr uint32_t WIFI_RETRY_MS = 10000;
constexpr uint16_t HTTP_TIMEOUT_MS = 3000;

// Bed occupancy. The ultrasonic sensor is mounted over or beside the bed and
// pointed at the mattress. The app's simulator uses 50-80 cm for in bed and
// 150-200 cm for out of bed, so anything under 100 cm counts as in bed.
constexpr float IN_BED_MAX_CM = 100.0f;

// LDR (GL5528 type) wired 3V3 -> LDR -> LDR_PIN -> 10k -> GND.
// Lux is estimated from the LDR resistance, good enough for dim vs. lit.
constexpr float LDR_SUPPLY_V = 3.3f;
constexpr float LDR_FIXED_OHMS = 10000.0f;
constexpr float LDR_OHMS_AT_10_LUX = 15000.0f;  // datasheet range is 8k to 20k
constexpr float LDR_GAMMA = 0.7f;

struct Reading {
  float temperature = NAN;
  float humidity = NAN;
  int light = -1;
  bool motion = false;
  float distanceCm = NAN;
};

DHT dht(DHT_PIN, DHT22);
String deviceId;
volatile bool motionSeen = false;
uint32_t lastSend = 0;
uint32_t lastWifiAttempt = 0;

static double round1(float v) { return roundf(v * 10.0f) / 10.0; }

// ---------------------------------------------------------------- sensors

#if SIMULATE_SENSORS

// No sensors attached. Produces values in the same ranges as the app's own
// simulator (src/utils/simulateEnvironment.ts) so the pipeline can be tested
// with a bare board. Every reading is tagged customSensors.simulated = true.

static float walk(float prev, float lo, float hi, float step) {
  float v = prev + (random(-1000, 1001) / 1000.0f) * step;
  return constrain(v, lo, hi);
}

Reading readSensors() {
  static float temp = 22.0f, hum = 50.0f, light = 400.0f, dist = 65.0f;
  static bool inBed = true;
  static uint32_t nextBedChange = 0;

  Reading r;
  uint32_t now = millis();
  r.motion = random(100) < 15;
  if (now >= nextBedChange) {
    if (nextBedChange != 0) {
      inBed = !inBed;
      r.motion = true;
    }
    nextBedChange = now + random(30000, 120000);
  }

  temp = walk(temp, 20.0f, 24.0f, 0.5f);
  hum = walk(hum, 40.0f, 60.0f, 2.0f);
  light = walk(light, 200.0f, 800.0f, 50.0f);
  dist = inBed ? walk(dist, 50.0f, 80.0f, 5.0f) : walk(dist, 150.0f, 200.0f, 10.0f);

  r.temperature = temp;
  r.humidity = hum;
  r.light = (int)light;
  r.distanceCm = dist;
  return r;
}

void setupSensors() { randomSeed(esp_random()); }

#else

void IRAM_ATTR onMotion() { motionSeen = true; }

// One HC-SR04 ping. Returns NAN on timeout (nothing within about 5 m).
static float pingCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  unsigned long us = pulseIn(ECHO_PIN, HIGH, 30000UL);
  if (us == 0) return NAN;
  return us * 0.0343f / 2.0f;
}

// Median of three pings to drop the odd bad echo.
static float readDistanceCm() {
  float s[3];
  int n = 0;
  for (int i = 0; i < 3; i++) {
    float d = pingCm();
    if (!isnan(d)) s[n++] = d;
    delay(30);
  }
  if (n == 0) return NAN;
  for (int i = 1; i < n; i++) {
    for (int j = i; j > 0 && s[j - 1] > s[j]; j--) {
      float t = s[j];
      s[j] = s[j - 1];
      s[j - 1] = t;
    }
  }
  return s[n / 2];
}

static int readLightLux() {
  uint32_t mv = 0;
  for (int i = 0; i < 8; i++) mv += analogReadMilliVolts(LDR_PIN);
  float v = (mv / 8) / 1000.0f;
  if (v < 0.01f) return 0;                  // dark, or LDR disconnected
  if (v > LDR_SUPPLY_V - 0.01f) v = LDR_SUPPLY_V - 0.01f;
  float rLdr = LDR_FIXED_OHMS * (LDR_SUPPLY_V - v) / v;
  float lux = 10.0f * powf(LDR_OHMS_AT_10_LUX / rLdr, 1.0f / LDR_GAMMA);
  return (int)constrain(lux, 0.0f, 100000.0f);
}

Reading readSensors() {
  Reading r;
  r.temperature = dht.readTemperature();
  r.humidity = dht.readHumidity();
  if (isnan(r.temperature) || isnan(r.humidity)) Serial.println("DHT22 read failed");

  r.light = readLightLux();

  r.distanceCm = readDistanceCm();
  if (isnan(r.distanceCm)) Serial.println("HC-SR04: no echo");

  // PIR output can go high and low between sends, so the interrupt latches it.
  r.motion = motionSeen || digitalRead(PIR_PIN) == HIGH;
  motionSeen = false;
  return r;
}

void setupSensors() {
  dht.begin();
  pinMode(PIR_PIN, INPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);
  analogSetPinAttenuation(LDR_PIN, ADC_11db);
  attachInterrupt(digitalPinToInterrupt(PIR_PIN), onMotion, RISING);
}

#endif

// ---------------------------------------------------------------- network

void startWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastWifiAttempt = millis();
}

// Non-blocking. Sensors keep running while WiFi is down; readings taken while
// offline are dropped rather than queued, since the dashboard only shows the
// latest one.
void maintainWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - lastWifiAttempt < WIFI_RETRY_MS) return;
  Serial.println("WiFi down, reconnecting");
  WiFi.disconnect();
  startWiFi();
}

String buildPayload(const Reading& r) {
  JsonDocument doc;
  doc["deviceId"] = deviceId;
  if (!isnan(r.temperature)) doc["temperature"] = round1(r.temperature);
  if (!isnan(r.humidity)) doc["humidity"] = round1(r.humidity);
  if (r.light >= 0) doc["light"] = r.light;
  doc["motion"] = r.motion;

  JsonObject custom = doc["customSensors"].to<JsonObject>();
  if (!isnan(r.distanceCm)) {
    custom["distance"] = round1(r.distanceCm);
    custom["inBed"] = r.distanceCm < IN_BED_MAX_CM;
  }
  custom["signal_strength"] = WiFi.RSSI();
  custom["uptime"] = millis() / 1000;
#if SIMULATE_SENSORS
  custom["simulated"] = true;
#endif

  String body;
  serializeJson(doc, body);
  return body;
}

bool postReading(const String& body) {
  WiFiClient client;
  HTTPClient http;
  http.setConnectTimeout(HTTP_TIMEOUT_MS);
  http.setTimeout(HTTP_TIMEOUT_MS);
  if (!http.begin(client, SERVER_URL)) {
    Serial.println("Bad SERVER_URL in secrets.h");
    return false;
  }
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(body);
  if (code > 0) {
    Serial.printf("POST %d\n", code);
  } else {
    Serial.printf("POST failed: %s\n", http.errorToString(code).c_str());
  }
  http.end();
  return code >= 200 && code < 300;
}

// ---------------------------------------------------------------- main

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println();
  Serial.println(SIMULATE_SENSORS ? "Vitalis sensor node (SIMULATED readings)" : "Vitalis sensor node");

  setupSensors();

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
#ifdef DEVICE_ID
  deviceId = DEVICE_ID;
#else
  deviceId = WiFi.macAddress();
#endif
  Serial.printf("Device ID: %s\n", deviceId.c_str());

  startWiFi();
  Serial.printf("Connecting to %s", WIFI_SSID);
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("WiFi connected, IP %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("WiFi not connected yet, will keep retrying");
  }
  Serial.printf("Posting to %s every %lu ms\n", SERVER_URL, (unsigned long)SEND_INTERVAL_MS);
}

void loop() {
  maintainWiFi();

  if (millis() - lastSend < SEND_INTERVAL_MS) return;
  lastSend = millis();

  Reading r = readSensors();
  String body = buildPayload(r);
  Serial.println(body);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Offline, reading not sent");
    return;
  }
  postReading(body);
}

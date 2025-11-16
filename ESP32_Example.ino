#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server endpoint
const char* serverUrl = "http://YOUR_COMPUTER_IP:3001/api/hardware";

// Sensor pins (adjust based on your setup)
const int TEMPERATURE_PIN = 34;
const int LIGHT_PIN = 35;
const int MOTION_PIN = 26;

// Update interval (milliseconds)
const unsigned long UPDATE_INTERVAL = 2000; // 2 seconds
unsigned long lastUpdate = 0;

void setup() {
  Serial.begin(115200);

  // Initialize pins
  pinMode(MOTION_PIN, INPUT);

  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  unsigned long currentTime = millis();

  if (currentTime - lastUpdate >= UPDATE_INTERVAL) {
    lastUpdate = currentTime;
    sendHardwareData();
  }
}

void sendHardwareData() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    // Read sensor values
    float temperature = readTemperature();
    float humidity = readHumidity();
    float pressure = readPressure();
    int light = analogRead(LIGHT_PIN);
    bool motion = digitalRead(MOTION_PIN);
    float batteryLevel = readBatteryLevel();

    // Create JSON document
    StaticJsonDocument<512> doc;

    // Add device ID (use ESP32 MAC address)
    doc["deviceId"] = WiFi.macAddress();

    // Add sensor readings
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;
    doc["pressure"] = pressure;
    doc["light"] = light;
    doc["motion"] = motion;
    doc["batteryLevel"] = batteryLevel;

    // Add custom sensors (optional)
    JsonObject customSensors = doc.createNestedObject("customSensors");
    customSensors["signal_strength"] = WiFi.RSSI();
    customSensors["uptime"] = millis() / 1000; // seconds

    // Serialize JSON to string
    String jsonString;
    serializeJson(doc, jsonString);

    // Send HTTP POST request
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    int httpResponseCode = http.POST(jsonString);

    if (httpResponseCode > 0) {
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);
      String response = http.getString();
      Serial.println("Response: " + response);
    } else {
      Serial.print("Error sending data: ");
      Serial.println(httpResponseCode);
    }

    http.end();
  } else {
    Serial.println("WiFi Disconnected");
  }
}

// Sensor reading functions - implement based on your actual sensors
float readTemperature() {
  // Example: Using DHT22 or other temperature sensor
  // For demo purposes, returning a simulated value
  int rawValue = analogRead(TEMPERATURE_PIN);
  return 20.0 + (rawValue / 4096.0) * 15.0; // Simulated temperature between 20-35°C
}

float readHumidity() {
  // Example: Using DHT22 or other humidity sensor
  // For demo purposes, returning a simulated value
  return 40.0 + random(0, 30); // Simulated humidity between 40-70%
}

float readPressure() {
  // Example: Using BMP280 or other pressure sensor
  // For demo purposes, returning a simulated value
  return 1000.0 + random(0, 50); // Simulated pressure around 1000-1050 hPa
}

float readBatteryLevel() {
  // Example: Reading battery voltage and converting to percentage
  // For demo purposes, returning a simulated value
  return 75.0 + random(0, 25); // Simulated battery level between 75-100%
}

/*
 * SETUP INSTRUCTIONS:
 *
 * 1. Install required libraries:
 *    - ArduinoJson (by Benoit Blanchon)
 *    Install via Arduino Library Manager
 *
 * 2. Update WiFi credentials:
 *    - Replace YOUR_WIFI_SSID with your WiFi network name
 *    - Replace YOUR_WIFI_PASSWORD with your WiFi password
 *
 * 3. Update server URL:
 *    - Replace YOUR_COMPUTER_IP with your computer's local IP address
 *    - Make sure your computer and ESP32 are on the same network
 *    - Keep the port as 3001 (or change if you modified the server)
 *
 * 4. Connect your sensors:
 *    - Temperature sensor to pin 34
 *    - Light sensor to pin 35
 *    - Motion sensor to pin 26
 *    - Adjust pin numbers based on your setup
 *
 * 5. Upload the code to your ESP32
 *
 * 6. Start the server on your computer:
 *    npm run server
 *
 * 7. Start the React app:
 *    npm run dev
 *
 * 8. Open the ESP32 Dashboard in your browser to see real-time data!
 */

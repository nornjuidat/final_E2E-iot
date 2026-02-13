/*
  Smart Irrigation ESP32/ESP8266 (MQTT)
  Sensors:
    - Soil moisture analog (example)
    - Light sensor (LDR) analog
  Actuator:
    - Relay for pump

  Topics (default):
    irrigation/<deviceId>/telemetry
    irrigation/<deviceId>/cmd/pump
    irrigation/<deviceId>/cmd/mode
    irrigation/<deviceId>/status
*/

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

#define PUMP_PIN 23
#define SOIL_PIN 36   // ADC1
#define LDR_PIN 39    // ADC1 (change if needed)

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASS = "YOUR_PASS";

const char* MQTT_HOST = "broker.hivemq.com";
const int   MQTT_PORT = 1883;

String deviceId = "main";
String baseTopic = "irrigation";

WiFiClient espClient;
PubSubClient mqtt(espClient);

bool pumpState = false;
String mode = "MANUAL";

unsigned long lastTelemetryMs = 0;
unsigned long pumpAutoOffMs = 0; // millis when to auto turn off (0 = none)

String tTelemetry() { return baseTopic + "/" + deviceId + "/telemetry"; }
String tCmdPump()   { return baseTopic + "/" + deviceId + "/cmd/pump"; }
String tCmdMode()   { return baseTopic + "/" + deviceId + "/cmd/mode"; }
String tStatus()    { return baseTopic + "/" + deviceId + "/status"; }

void setPump(bool on) {
  pumpState = on;
  digitalWrite(PUMP_PIN, on ? LOW : HIGH); // if relay is active LOW; flip if active HIGH
}

void publishStatus(const char* lastCmd) {
  StaticJsonDocument<256> doc;
  doc["mode"] = mode;
  doc["pumpState"] = pumpState ? 1 : 0;
  doc["lastCmd"] = lastCmd;

  char buf[256];
  size_t n = serializeJson(doc, buf);
  mqtt.publish(tStatus().c_str(), buf, n);
}

void onMessage(char* topic, byte* payload, unsigned int length) {
  String t = String(topic);
  String msg;
  msg.reserve(length);
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];

  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, msg);
  if (err) return;

  if (t == tCmdPump()) {
    bool on = doc["on"] | false;
    int durationSec = doc["durationSec"] | 0;
    setPump(on);

    if (on && durationSec > 0) {
      pumpAutoOffMs = millis() + (unsigned long)durationSec * 1000UL;
    } else {
      pumpAutoOffMs = 0;
    }

    publishStatus(on ? "pump:on" : "pump:off");
  }

  if (t == tCmdMode()) {
    const char* m = doc["mode"] | "MANUAL";
    mode = String(m);
    publishStatus("mode:set");
  }
}

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
  }
}

void connectMqtt() {
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMessage);

  while (!mqtt.connected()) {
    String cid = "irrigation-esp-" + deviceId + "-" + String((uint32_t)ESP.getEfuseMac(), HEX);
    mqtt.connect(cid.c_str());
    delay(300);
  }
  mqtt.subscribe(tCmdPump().c_str());
  mqtt.subscribe(tCmdMode().c_str());
  publishStatus("boot");
}

void setup() {
  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, HIGH); // pump off
  Serial.begin(115200);

  connectWifi();
  connectMqtt();
}

void loop() {
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();

  // Auto-off
  if (pumpAutoOffMs > 0 && millis() > pumpAutoOffMs) {
    setPump(false);
    pumpAutoOffMs = 0;
    publishStatus("auto_off");
  }

  // Telemetry every 5 seconds
  if (millis() - lastTelemetryMs > 5000) {
    lastTelemetryMs = millis();
    int soil = analogRead(SOIL_PIN);
    int light = analogRead(LDR_PIN);

    StaticJsonDocument<256> doc;
    doc["ts"] = (long)(time(nullptr)); // may be 0 without NTP; OK
    doc["soil"] = soil;
    doc["light"] = light;
    doc["pumpState"] = pumpState ? 1 : 0;

    char buf[256];
    size_t n = serializeJson(doc, buf);
    mqtt.publish(tTelemetry().c_str(), buf, n);
  }
}

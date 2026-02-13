const mqtt = require("mqtt");

const MQTT_URL = process.env.MQTT_URL || "mqtt://broker.hivemq.com";
const BASE = process.env.MQTT_BASE_TOPIC || "irrigation";
const DEVICE_ID = process.env.MQTT_DEVICE_ID || "main";

const client = mqtt.connect(MQTT_URL, {
  clientId: `irrigation-server-${DEVICE_ID}-${Math.random().toString(16).slice(2)}`,
  clean: true,
  reconnectPeriod: 1000,
});

client.on("connect", () => {
  console.log("✅ MQTT connected:", MQTT_URL);
  // Telemetry and device status
  client.subscribe(`${BASE}/+/telemetry`);
  client.subscribe(`${BASE}/+/status`);
});

client.on("error", (err) => {
  console.error("❌ MQTT error:", err.message);
});

function topicFor(deviceId, suffix) {
  return `${BASE}/${deviceId}/${suffix}`;
}

function publishJson(topic, payload, opts = { qos: 0, retain: false }) {
  client.publish(topic, JSON.stringify(payload), opts);
}

module.exports = { client, topicFor, publishJson, BASE, DEVICE_ID };

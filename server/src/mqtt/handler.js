const { client, BASE } = require("./client");
const irrigation = require("../services/irrigationService");

function extractDeviceId(topic) {
  // `${BASE}/+/telemetry`
  // topic: irrigation/<deviceId>/telemetry
  const parts = topic.split("/");
  if (parts.length < 3) return null;
  return parts[1];
}

function safeJson(msg) {
  try {
    return JSON.parse(msg.toString());
  } catch {
    return null;
  }
}

function start() {
  client.on("message", (topic, message) => {
    if (!topic.startsWith(`${BASE}/`)) return;
    const deviceId = extractDeviceId(topic);
    if (!deviceId) return;

    const data = safeJson(message);
    if (!data) return;

    if (topic.endsWith("/telemetry")) {
      irrigation.handleTelemetry(deviceId, data).catch(() => {});
    } else if (topic.endsWith("/status")) {
      irrigation.handleDeviceStatus(deviceId, data).catch(() => {});
    }
  });
}

module.exports = { start };

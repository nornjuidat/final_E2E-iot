const router = require("express").Router();
const irrigation = require("../services/irrigationService");

// Optional REST telemetry endpoint (if you want to test without MQTT)
router.post("/telemetry", async (req, res) => {
  const deviceId = process.env.MQTT_DEVICE_ID || "main";
  await irrigation.handleTelemetry(deviceId, req.body || {});
  res.json({ success: true });
});

module.exports = router;

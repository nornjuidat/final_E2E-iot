const router = require("express").Router();
const irrigation = require("../services/irrigationService");

// Status
router.get("/status", async (req, res) => {
  res.json(await irrigation.getStatus());
});

// Mode
router.get("/mode", async (req, res) => {
  res.json({ mode: await irrigation.getMode(), validModes: irrigation.VALID_MODES });
});

router.post("/mode", async (req, res) => {
  try {
    const { mode } = req.body;
    const result = await irrigation.setMode(String(mode).toUpperCase());
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

// Settings
router.get("/settings", async (req, res) => {
  res.json(await irrigation.getSettings());
});

router.put("/settings", async (req, res) => {
  try {
    const updated = await irrigation.updateSettings(req.body || {});
    res.json({ success: true, settings: updated });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

// Manual pump
router.post("/manual/pump", async (req, res) => {
  const { on, force } = req.body || {};
  const mode = "MANUAL";
  try {
    if (on) {
      const result = await irrigation.pumpOn({ mode, reason: "MANUAL", durationSec: 0, force: !!force });
      if (result.blocked) return res.status(409).json(result);
      return res.json(result);
    } else {
      return res.json(await irrigation.pumpOff({ mode, reason: "MANUAL_OFF" }));
    }
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Logs
router.get("/logs", async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 200;
  res.json(await irrigation.listLogs(limit));
});

// Schedules
router.get("/schedules", async (req, res) => {
  res.json(await irrigation.listSchedules());
});

router.post("/schedules", async (req, res) => {
  try {
    const { enabled = true, day_of_week, start_time, duration_min } = req.body || {};
    if (day_of_week === undefined || start_time === undefined || duration_min === undefined) {
      return res.status(400).json({ success: false, message: "day_of_week, start_time, duration_min required" });
    }
    const created = await irrigation.createSchedule({
      enabled: !!enabled,
      day_of_week: Number(day_of_week),
      start_time: String(start_time),
      duration_min: Number(duration_min),
    });
    res.status(201).json({ success: true, ...created });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

router.put("/schedules/:id", async (req, res) => {
  try {
    await irrigation.updateSchedule(Number(req.params.id), req.body || {});
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

router.delete("/schedules/:id", async (req, res) => {
  try {
    await irrigation.deleteSchedule(Number(req.params.id));
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

module.exports = router;

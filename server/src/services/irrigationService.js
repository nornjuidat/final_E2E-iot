const pool = require("../models/db");
const IrrigationModel = require("../models/irrigation");
const state = require("./state");
const { publishJson, topicFor } = require("../mqtt/client");

const VALID_MODES = ["WEATHER", "SOIL", "MANUAL", "SCHEDULED"];

const model = new IrrigationModel(pool);

async function init() {
  await model.initSchema();
  console.log("✅ DB schema ready");
}

function getDeviceId() {
  return process.env.MQTT_DEVICE_ID || "main";
}

function getLastTelemetry(deviceId = getDeviceId()) {
  return state.lastTelemetry[deviceId] || null;
}

function setLastTelemetry(deviceId, data) {
  state.lastTelemetry[deviceId] = data;
}

function clearPendingAutoOff(deviceId) {
  const t = state.pendingAutoOff[deviceId];
  if (t) clearTimeout(t);
  state.pendingAutoOff[deviceId] = null;
}

async function startLogIfNeeded(deviceId, meta) {
  if (state.activeLogId[deviceId]) return state.activeLogId[deviceId];
  const id = await model.createLog({
    mode: meta.mode,
    reason: meta.reason,
    start_time: new Date(),
    soil_at_start: meta.soil,
    light_at_start: meta.light,
  });
  state.activeLogId[deviceId] = id;
  state.activeLogStart[deviceId] = new Date();
  state.activeLogMeta[deviceId] = meta;
  return id;
}

async function closeLogIfNeeded(deviceId) {
  const id = state.activeLogId[deviceId];
  if (!id) return;
  await model.closeLog(id, new Date());
  state.activeLogId[deviceId] = null;
  state.activeLogStart[deviceId] = null;
  state.activeLogMeta[deviceId] = null;
}

async function canRunByLight({ light, lightThreshold }) {
  if (light == null) return false; // no data => be safe
  return Number(light) < Number(lightThreshold);
}

async function pumpOn({ deviceId = getDeviceId(), mode, reason, durationSec = 0, force = false }) {
  const settings = await model.getSettings();
  const tel = getLastTelemetry(deviceId);

  const light = tel?.light ?? null;
  const soil = tel?.soil ?? null;

  const okLight = await canRunByLight({ light, lightThreshold: settings.light_threshold });

  if (!okLight && !force && mode === "MANUAL") {
    // Manual warning flow
    return {
      blocked: true,
      message: "לא מומלץ להפעיל את המשאבה כרגע. האם תרצה להפעיל בכל זאת?",
      light,
      threshold: settings.light_threshold,
    };
  }

  // For non-manual modes: hard block if too bright
  if (!okLight && !force && mode !== "MANUAL") {
    return { blocked: true, message: "Blocked by light protection", light, threshold: settings.light_threshold };
  }

  // manual max run safety (server-side auto-off)
  const maxRun = Number(settings.manual_max_run_sec || 1800);
  if (mode === "MANUAL" && durationSec === 0) {
    durationSec = maxRun;
  }

  publishJson(topicFor(deviceId, "cmd/pump"), {
    on: true,
    reason,
    durationSec,
  });

  state.pumpState[deviceId] = true;
  await startLogIfNeeded(deviceId, { mode, reason, soil, light });

  clearPendingAutoOff(deviceId);
  if (durationSec && durationSec > 0) {
    state.pendingAutoOff[deviceId] = setTimeout(() => {
      pumpOff({ deviceId, mode, reason: `${reason}_AUTO_OFF` }).catch(() => {});
    }, durationSec * 1000);
  }

  return { success: true, on: true, durationSec };
}

async function pumpOff({ deviceId = getDeviceId(), mode, reason }) {
  publishJson(topicFor(deviceId, "cmd/pump"), { on: false, reason, durationSec: 0 });
  state.pumpState[deviceId] = false;
  clearPendingAutoOff(deviceId);
  await closeLogIfNeeded(deviceId);
  return { success: true, on: false };
}

async function setMode(mode) {
  if (!VALID_MODES.includes(mode)) throw new Error("Invalid mode");
  await model.setMode(mode);
  const deviceId = getDeviceId();
  publishJson(topicFor(deviceId, "cmd/mode"), { mode });
  return { mode };
}

async function getMode() {
  return await model.getMode();
}

async function getStatus() {
  const deviceId = getDeviceId();
  const mode = await model.getMode();
  const settings = await model.getSettings();
  const tel = getLastTelemetry(deviceId);
  const pump = !!state.pumpState[deviceId];
  return { deviceId, mode, pump, telemetry: tel, settings };
}

async function handleTelemetry(deviceId, data) {
  // normalize
  const ts = data.ts ? new Date(data.ts * 1000) : new Date();
  const soil = data.soil ?? null;
  const light = data.light ?? null;
  const pump_state = data.pumpState ?? data.pump_state ?? null;

  setLastTelemetry(deviceId, { ts: ts.toISOString(), soil, light, pump_state });

  // store sample (optional but nice)
  try {
    await model.insertTelemetry({ ts, soil, light, pump_state });
  } catch (e) {
    // ignore DB insert errors (table missing etc) after init should be fine
  }

  // Run engine based on mode
  const mode = await model.getMode();
  const settings = await model.getSettings();

  if (mode === "SOIL") {
    const target = Number(settings.soil_target);
    const h = Number(settings.soil_hysteresis);

    const low = target - h;
    const high = target + h;

    // If soil is null - can't act
    if (soil == null) return;

    if (soil < low) {
      await pumpOn({ deviceId, mode: "SOIL", reason: "SOIL_DRY", durationSec: 0 });
    } else if (soil > high) {
      await pumpOff({ deviceId, mode: "SOIL", reason: "SOIL_OK" });
    }
  }
}

async function handleDeviceStatus(deviceId, data) {
  // If ESP reports pump state, keep in sync and logs
  if (typeof data.pumpState !== "undefined") {
    const on = !!data.pumpState;
    const prev = !!state.pumpState[deviceId];
    state.pumpState[deviceId] = on;

    if (on && !prev) {
      // Started externally
      const mode = await model.getMode();
      const tel = getLastTelemetry(deviceId);
      await startLogIfNeeded(deviceId, {
        mode,
        reason: "DEVICE_STARTED",
        soil: tel?.soil ?? null,
        light: tel?.light ?? null,
      });
    } else if (!on && prev) {
      await closeLogIfNeeded(deviceId);
    }
  }
}

async function listLogs(limit) {
  return await model.listLogs(limit);
}

async function listSchedules() {
  return await model.listSchedules();
}

async function createSchedule(body) {
  const id = await model.createSchedule(body);
  return { id };
}

async function updateSchedule(id, patch) {
  await model.updateSchedule(id, patch);
  return { success: true };
}

async function deleteSchedule(id) {
  await model.deleteSchedule(id);
  return { success: true };
}

async function getSettings() {
  return await model.getSettings();
}

async function updateSettings(patch) {
  return await model.updateSettings(patch);
}

module.exports = {
  init,
  setMode,
  getMode,
  getStatus,
  pumpOn,
  pumpOff,
  handleTelemetry,
  handleDeviceStatus,
  listLogs,
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getSettings,
  updateSettings,
  VALID_MODES,
};

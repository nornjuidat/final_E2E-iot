// Simple in-memory runtime state (single-node server).
const state = {
  lastTelemetry: {}, // deviceId -> {ts, soil, light, pumpState?}
  pumpState: {}, // deviceId -> boolean
  activeLogId: {}, // deviceId -> log row id
  activeLogStart: {}, // deviceId -> Date
  activeLogMeta: {}, // deviceId -> {mode, reason, soil, light}
  pendingAutoOff: {}, // deviceId -> timeout handle
};

module.exports = state;

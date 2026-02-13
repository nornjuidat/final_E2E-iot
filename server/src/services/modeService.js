const mqtt = require('../mqtt/client');
const db = require('../models/db');

async function setMode(mode) {
  await db.query('UPDATE system_state SET mode=? WHERE id=1', [mode]);

  mqtt.publish(
    'irrigation/main/cmd/mode',
    JSON.stringify({ mode })
  );
}

async function getMode() {
  const [rows] = await db.query('SELECT mode FROM system_state WHERE id=1');
  return rows[0].mode;
}

module.exports = { setMode, getMode };

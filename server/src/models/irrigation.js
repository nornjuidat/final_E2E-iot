class IrrigationModel {
  constructor(db) {
    this.db = db;
  }

  async initSchema() {
    // Best-effort init: run schema statements split by ';'
    const fs = require("fs");
    const path = require("path");
    const schemaPath = path.join(__dirname, "..", "..", "sql", "schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf-8");
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length);

    for (const stmt of statements) {
      await this.db.query(stmt);
    }
  }

  async getMode() {
    const [rows] = await this.db.query("SELECT mode FROM system_state WHERE id=1");
    return rows?.[0]?.mode || "MANUAL";
  }

  async setMode(mode) {
    await this.db.query("UPDATE system_state SET mode=? WHERE id=1", [mode]);
  }

  async getSettings() {
    const [rows] = await this.db.query("SELECT * FROM settings WHERE id=1");
    return rows?.[0];
  }

  async updateSettings(patch) {
    const allowed = ["soil_target","soil_hysteresis","light_threshold","manual_max_run_sec","weather_is_hot"];
    const keys = Object.keys(patch).filter(k => allowed.includes(k));
    if (!keys.length) return await this.getSettings();

    const setClause = keys.map(k => `${k}=?`).join(", ");
    const values = keys.map(k => patch[k]);
    await this.db.query(`UPDATE settings SET ${setClause} WHERE id=1`, values);
    return await this.getSettings();
  }

  async insertTelemetry(sample) {
    const { ts, soil, light, pump_state } = sample;
    await this.db.query(
      "INSERT INTO telemetry_samples (ts, soil, light, pump_state) VALUES (?,?,?,?)",
      [ts, soil ?? null, light ?? null, pump_state ?? null]
    );
  }

  async createLog({ mode, reason, start_time, soil_at_start, light_at_start }) {
    const [res] = await this.db.query(
      "INSERT INTO irrigation_logs (mode, reason, start_time, soil_at_start, light_at_start) VALUES (?,?,?,?,?)",
      [mode, reason, start_time, soil_at_start ?? null, light_at_start ?? null]
    );
    return res.insertId;
  }

  async closeLog(id, end_time) {
    // duration_sec in seconds
    await this.db.query(
      "UPDATE irrigation_logs SET end_time=?, duration_sec=TIMESTAMPDIFF(SECOND, start_time, ?) WHERE id=?",
      [end_time, end_time, id]
    );
  }

  async listLogs(limit = 200) {
    const [rows] = await this.db.query(
      "SELECT * FROM irrigation_logs ORDER BY id DESC LIMIT ?",
      [Number(limit)]
    );
    return rows;
  }

  async createSchedule({ enabled, day_of_week, start_time, duration_min }) {
    const [res] = await this.db.query(
      "INSERT INTO schedules (enabled, day_of_week, start_time, duration_min) VALUES (?,?,?,?)",
      [enabled ? 1 : 0, day_of_week, start_time, duration_min]
    );
    return res.insertId;
  }

  async listSchedules() {
    const [rows] = await this.db.query("SELECT * FROM schedules ORDER BY id DESC");
    return rows;
  }

  async updateSchedule(id, patch) {
    const allowed = ["enabled","day_of_week","start_time","duration_min"];
    const keys = Object.keys(patch).filter(k => allowed.includes(k));
    if (!keys.length) return;

    const setClause = keys.map(k => `${k}=?`).join(", ");
    const values = keys.map(k => patch[k]);
    values.push(id);
    await this.db.query(`UPDATE schedules SET ${setClause} WHERE id=?`, values);
  }

  async deleteSchedule(id) {
    await this.db.query("DELETE FROM schedules WHERE id=?", [id]);
  }
}

module.exports = IrrigationModel;

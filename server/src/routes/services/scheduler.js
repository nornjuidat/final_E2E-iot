const cron = require("node-cron");
const irrigation = require("./irrigationService");

let task = null;

function parseTimeToHM(timeStr) {
  // "HH:MM:SS" or "HH:MM"
  const [h, m] = timeStr.split(":").map((x) => parseInt(x, 10));
  return { h, m };
}

function isNowMatch(h, m, now = new Date()) {
  return now.getHours() === h && now.getMinutes() === m;
}

function dayOfWeek(now = new Date()) {
  // JS: 0=Sun..6=Sat (matches our DB)
  return now.getDay();
}

async function runTick() {
  const status = await irrigation.getStatus();
  const mode = status.mode;
  const settings = status.settings;

  const now = new Date();

  if (mode === "WEATHER") {
    const isHot = !!settings.weather_is_hot;
    const events = isHot
      ? [
          { at: "06:00", durationSec: 3 * 60 * 60 },
          { at: "12:00", durationSec: 3 * 60 * 60 },
          { at: "18:00", durationSec: 3 * 60 * 60 },
        ]
      : [
          { at: "07:00", durationSec: 2 * 60 * 60 },
          { at: "19:00", durationSec: 2 * 60 * 60 },
        ];

    for (const ev of events) {
      const { h, m } = parseTimeToHM(ev.at);
      if (isNowMatch(h, m, now)) {
        await irrigation.pumpOn({
          mode: "WEATHER",
          reason: isHot ? "WEATHER_HOT" : "WEATHER_COLD",
          durationSec: ev.durationSec,
        });
      }
    }
  }

  if (mode === "SCHEDULED") {
    const schedules = await irrigation.listSchedules();
    const today = dayOfWeek(now);

    for (const sch of schedules) {
      if (!sch.enabled) continue;
      if (Number(sch.day_of_week) !== Number(today)) continue;

      const { h, m } = parseTimeToHM(String(sch.start_time));
      if (isNowMatch(h, m, now)) {
        await irrigation.pumpOn({
          mode: "SCHEDULED",
          reason: "SCHEDULE_EVENT",
          durationSec: Number(sch.duration_min) * 60,
        });
      }
    }
  }
}

function start() {
  if (task) return;
  // Every minute
  task = cron.schedule("* * * * *", () => {
    runTick().catch((e) => console.error("scheduler tick error:", e.message));
  });
  console.log("✅ Scheduler started (tick every minute)");
}

module.exports = { start };

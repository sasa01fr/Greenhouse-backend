const { Point, writeApi, queryApi } = require("../utils/influx");
const mqttClient = require("../mqtt/mqttClient");

let watering = false;
let startTime = null;
let duration = 0;
let schedule = { enabled: false, days: {} };

// In-memory history (will be saved in Influx)
const MAX_HISTORY = 50;

/**
 * Start watering (manual or auto)
 */
async function startWatering(req, res, mode = "manual") {
  try {
    duration = parseInt(req.body.duration || 0);
    if (duration <= 0 || duration > 14400) // 4h safety limit
      return res.status(400).json({ error: "Invalid duration" });

    watering = true;
    startTime = new Date();

    // Send MQTT command to ESP32
    mqttClient.publish("greenhouse/hydroponics/command", JSON.stringify({ action: "start", duration }));

    // Log to Influx
    const point = new Point("hydroponics")
      .booleanField("watering", true)
      .stringField("mode", mode)
      .floatField("duration", duration)
      .timestamp(startTime);

    await writeApi.writePoint(point);
    await writeApi.flush();

    console.log(`💧 Watering started (${mode}) for ${duration}s`);
    res.json({ status: "started", startTime, duration });
  } catch (err) {
    console.error("❌ Error starting watering:", err);
    res.status(500).json({ error: "Failed to start watering" });
  }
}

/**
 * Stop watering
 */
async function stopWatering(req, res) {
  try {
    if (!watering)
      return res.status(400).json({ error: "Not currently watering" });

    watering = false;
    const endTime = new Date();

    // Send MQTT command
    mqttClient.publish("greenhouse/hydroponics/command", JSON.stringify({ action: "stop" }));

    // Log to Influx
    const point = new Point("hydroponics")
      .booleanField("watering", false)
      .stringField("mode", "manual")
      .floatField("duration", duration)
      .timestamp(endTime);

    await writeApi.writePoint(point);
    await writeApi.flush();

    console.log("🛑 Watering stopped");
    res.json({ status: "stopped", endTime });
  } catch (err) {
    console.error("❌ Error stopping watering:", err);
    res.status(500).json({ error: "Failed to stop watering" });
  }
}

/**
 * Get status
 */
async function getStatus(req, res) {
  try {
    res.json({
      status: "online",
      watering,
      startTime,
      duration
    });
  } catch {
    res.status(500).json({ status: "offline" });
  }
}

/**
 * Schedule management
 */
function getSchedule(req, res) {
  res.json(schedule);
}

function updateSchedule(req, res) {
  schedule = req.body;
  console.log("📅 Schedule updated:", schedule);
  res.json({ ok: true });
}

/**
 * Get watering history (last 50)
 */
async function getHistory(req, res) {
  try {
    const fluxQuery = `
      from(bucket: "${process.env.INFLUX_BUCKET}")
        |> range(start: -7d)
        |> filter(fn: (r) => r._measurement == "hydroponics")
        |> filter(fn: (r) => r._field == "watering")
        |> limit(n: ${MAX_HISTORY})
    `;

    const rows = [];
    await queryApi.collectRows(fluxQuery, row => rows.push(row));

    res.json({ sessions: rows });
  } catch (err) {
    console.error("❌ Error fetching history:", err);
    res.status(500).json({ error: "Failed to get history" });
  }
}

module.exports = {
  startWatering,
  stopWatering,
  getStatus,
  getSchedule,
  updateSchedule,
  getHistory
};

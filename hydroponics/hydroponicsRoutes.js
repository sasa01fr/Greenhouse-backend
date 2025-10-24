const express = require("express");
const router = express.Router();
const { queryApi } = require("../utils/influx");

router.get("/history", async (req, res) => {
  try {
    const fluxQuery = `
      from(bucket:"${process.env.INFLUX_BUCKET}")
      |> range(start: -30d)
      |> filter(fn: (r) => r._measurement == "watering_sessions")
    `;
    const result = [];
    await queryApi.collectRows(fluxQuery, row => result.push(row));
    res.json({ sessions: result });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const { queryApi } = require("../utils/influx");

const fieldMapping = {
  temperatura_aer: { name: "Temperatura Aer", unit: "°C", emoji: "🌡️" },
  temperatura_sol: { name: "Temperatura Sol", unit: "°C", emoji: "🌱" },
  umiditate: { name: "Umiditate Sol", unit: "%", emoji: "💧" },
  umiditate_aer: { name: "Umiditate Aer", unit: "%", emoji: "☁️" },
  luminositate: { name: "Luminozitate", unit: "lx", emoji: "💡" },
  presiune: { name: "Presiune", unit: "hPa", emoji: "⚖️" }
};

router.get("/history", async (req, res) => {
  try {
    // Fetch only numeric fields
    const numericFields = Object.keys(fieldMapping)
      .filter(f => f !== "someBooleanField"); // replace with your boolean fields

    const data = {};

    for (const field of numericFields) {
      const fluxQuery = `
        from(bucket:"${process.env.INFLUX_BUCKET}")
        |> range(start: 0)
        |> filter(fn: (r) => r._measurement == "senzor" and r._field == "${field}")
        |> aggregateWindow(every: 1h, fn: mean)
        |> sort(columns: ["_time"])
      `;

      data[field] = [];
      await queryApi.collectRows(fluxQuery, row => {
        data[field].push({
          time: row._time,
          value: row._value,
          name: fieldMapping[field].name,
          unit: fieldMapping[field].unit,
          emoji: fieldMapping[field].emoji
        });
      });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

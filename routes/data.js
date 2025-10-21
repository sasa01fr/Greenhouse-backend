const express = require("express");
const router = express.Router();
const { queryApi } = require("../utils/influx");

// Mapare _field -> titlu/unitate/emoji
const fieldMapping = {
  temperatura_aer: { name: "Temperatura Aer", unit: "°C", emoji: "🌡️" },
  temperatura_sol: { name: "Temperatura Sol", unit: "°C", emoji: "🌱" },
  umiditate: { name: "Umiditate Sol", unit: "%", emoji: "💧" },
  umiditate_aer: { name: "Umiditate Aer", unit: "%", emoji: "☁️" },
  luminositate: { name: "Luminozitate", unit: "lx", emoji: "💡" },
  presiune: { name: "Presiune", unit: "hPa", emoji: "⚖️" }
};

router.get("/", async (req, res) => {
  try {
    const fluxQuery = `from(bucket:"${process.env.INFLUX_BUCKET}") 
                       |> range(start: -1h)
                       |> filter(fn: (r) => r._measurement == "senzor")
                       |> last()`;

    const data = [];
    await queryApi.collectRows(fluxQuery, row => data.push(row));

    const grouped = {};
    data.forEach(d => {
      if (fieldMapping[d._field]) {
        grouped[d._field] = {
          id: d._field,
          name: fieldMapping[d._field].name,
          value: d._value,
          unit: fieldMapping[d._field].unit,
          emoji: fieldMapping[d._field].emoji
        };
      }
    });

    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

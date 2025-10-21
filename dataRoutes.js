const express = require("express");
const router = express.Router();
const { queryApi } = require("../utils/influx");

// GET /api/data?field=temperatura&range=-6h
router.get("/", async (req, res) => {
  try {
    const { field = "temperatura", range = "-1h" } = req.query;

    const fluxQuery = `
      from(bucket: "Greenhouse")
        |> range(start: ${range})
        |> filter(fn: (r) => r._measurement == "senzor")
        |> filter(fn: (r) => r._field == "${field}")
    `;

    let rows = [];
    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      rows.push(tableMeta.toObject(values));
    }

    res.json(rows);
  } catch (err) {
    console.error("❌ Error querying Influx:", err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const { queryApi } = require("../utils/influx");

router.get("/", async (req, res) => {
  try {
    const fluxQuery = `from(bucket:"${process.env.INFLUX_BUCKET}") |> range(start: -1h)`;
    const data = [];
    await queryApi.collectRows(fluxQuery, row => data.push(row));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

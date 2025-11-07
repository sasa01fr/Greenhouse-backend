require("dotenv").config();

const express = require("express");
const cors = require("cors");

const hydroponicsRoutes = require("./hydroponics/hydroponicsRoutes");
const dataRoutes = require("./routes/data");
const deviceRoutes = require("./routes/deviceRoutes");
const { getDeviceConfigs, updateDeviceConfigs, getDeviceConfig, updateDeviceConfig } = require("./routes/deviceConfig");

require("./mqtt/mqttClient");
const { writeApi, queryApi } = require("./utils/influx");

const app = express();

app.use(cors());
app.use(express.static("public"));
app.use(express.json());

app.use("/api/data", dataRoutes);
app.use("/api/hydroponics", hydroponicsRoutes);
app.use("/api", deviceRoutes);

app.get("/device-configs", getDeviceConfigs);
app.post("/device-configs", updateDeviceConfigs);
app.get("/device/:deviceId/config", getDeviceConfig);
app.post("/device/:deviceId/config", updateDeviceConfig);

app.get("/devices", (req, res) => res.redirect('/api/devices'));
app.get("/device/:deviceId/sensors", (req, res) => res.redirect(`/api/device/${req.params.deviceId}/sensors`));
app.get("/device/:deviceId/sensors/list", (req, res) => res.redirect(`/api/device/${req.params.deviceId}/sensors/list`));
app.get("/device/:deviceId/graph/:sensorType/:timeRange", (req, res) => res.redirect(`/api/device/${req.params.deviceId}/graph/${req.params.sensorType}/${req.params.timeRange}`));

require("./hydroponics/hydroponicsScheduler");

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
  console.log(`🌐 API available at http://localhost:${PORT}`);
});

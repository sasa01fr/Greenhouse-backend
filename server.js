// Load environment variables first
require("dotenv").config();

const express = require("express");
const cors = require("cors");

// Routes
const hydroponicsRoutes = require("./hydroponics/hydroponicsRoutes");
const authRoutes = require("./routes/auth");
const dataRoutes = require("./routes/data");

// Utils
require("./mqtt/mqttClient"); // Start MQTT listener
const { writeApi, queryApi } = require("./utils/influx"); // InfluxDB

const app = express();

// Middleware
app.use(cors());
app.use(express.static("public"));
app.use(express.json());

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/hydroponics", hydroponicsRoutes);

// Start scheduler
require("./hydroponics/hydroponicsScheduler");

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));

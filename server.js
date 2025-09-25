const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.static("public"));
app.use(express.json());

// Import utils
const { writeApi, queryApi } = require("./utils/influx"); // pentru InfluxDB
require("./mqtt/mqttClient"); // pornește listener-ul MQTT

// Import routes
const authRoutes = require("./routes/auth"); // pentru register/login
const dataRoutes = require("./routes/data"); // pentru datele senzorilor

// Folosește rutele
app.use("/api/auth", authRoutes);
app.use("/api/data", dataRoutes);

// Pornește serverul
const PORT = process.env.PORT || 2000;
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));



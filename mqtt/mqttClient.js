const mqtt = require("mqtt");
const { writeApi, Point } = require("../utils/influx");

// Conectare MQTT
const mqttClient = mqtt.connect(process.env.MQTT_URL || "mqtt://localhost:1883");

mqttClient.on("connect", () => {
  console.log("✅ MQTT connected");
  mqttClient.subscribe("greenhouse/sensor", err => {
    if (err) console.error("❌ MQTT subscribe error:", err);
  });
});

// Buffer pentru puncte InfluxDB
const pointsBuffer = [];

// Mesaje MQTT
mqttClient.on("message", (topic, message) => {
  try {
    const data = JSON.parse(message.toString());

    const point = new Point("senzor");

    // Date senzori
    if (data.temperatura != null) point.floatField("temperatura", data.temperatura);
    if (data.umiditate != null) point.floatField("umiditate", data.umiditate);
    if (data.temperatura_sol != null) point.floatField("temperatura_sol", data.temperatura_sol);
    if (data.umiditate_sol != null) point.floatField("umiditate_sol", data.umiditate_sol);
    if (data.luminozitate != null) point.floatField("luminozitate", data.luminozitate);
    if (data.presiune != null) point.floatField("presiune", data.presiune);

    // Comenzi actuatoare
    if (data.pompa != null) point.booleanField("pompa", data.pompa);
    if (data.ventilator != null) point.booleanField("ventilator", data.ventilator);
    if (data.lumini != null) point.booleanField("lumini", data.lumini);

    // Adăugăm punctul în buffer
    pointsBuffer.push(point);

    console.log("📥 Date MQTT primite și adăugate în buffer:", data);

  } catch (err) {
    console.error("❌ MQTT message error:", err.message);
  }
});

// Flush periodic către InfluxDB la fiecare 5 secunde
setInterval(() => {
  if (pointsBuffer.length > 0) {
    writeApi.writePoints(pointsBuffer.splice(0, pointsBuffer.length));
    writeApi.flush()
      .then(() => console.log("✅ Date scrise în InfluxDB"))
      .catch(err => console.error("❌ Eroare scriere InfluxDB:", err.message));
  }
}, 5000);

module.exports = mqttClient;

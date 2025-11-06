const mqtt = require("mqtt");
const { writeApi, Point } = require("../utils/influx");


const mqttClient = mqtt.connect(process.env.MQTT_URL || "mqtt://192.168.1.5:1883");

mqttClient.on("connect", () => {
  console.log("✅ MQTT connected");
  
  
  mqttClient.subscribe("greenhouse/+/sensor", err => {
    if (err) console.error("❌ MQTT subscribe error (sensor):", err);
    else console.log("👂 Subscribed to: greenhouse/+/sensor");
  });
  
  mqttClient.subscribe("greenhouse/+/sensors", err => {
    if (err) console.error("❌ MQTT subscribe error (sensors):", err);
    else console.log("👂 Subscribed to: greenhouse/+/sensors");
  });
  
  
  mqttClient.subscribe("greenhouse/sensor", err => {
    if (err) console.error("❌ MQTT subscribe error (legacy):", err);
    else console.log("👂 Subscribed to: greenhouse/sensor");
  });
});


const pointsBuffer = [];


mqttClient.on("message", (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    console.log(`📨 Received MQTT message on topic: ${topic}`);

   
    let deviceId = "default_device";
    const topicParts = topic.split('/');
    if (topicParts.length >= 2 && topicParts[0] === 'greenhouse') {
      deviceId = topicParts[1] || "default_device";
    }

    const point = new Point("senzor")
      .tag("device_id", deviceId);

    
    let sensorData = data;
    if (data.sensors && typeof data.sensors === 'object') {
      sensorData = data.sensors;
    }

   
    if (sensorData.temperatura != null) point.floatField("temperatura", sensorData.temperatura);
    if (sensorData.umiditate != null) point.floatField("umiditate", sensorData.umiditate);
    if (sensorData.temperatura_sol != null) point.floatField("temperatura_sol", sensorData.temperatura_sol);
    if (sensorData.umiditate_sol != null) point.floatField("umiditate_sol", sensorData.umiditate_sol);
    if (sensorData.luminozitate != null) point.floatField("luminozitate", sensorData.luminozitate);
    if (sensorData.presiune != null) point.floatField("presiune", sensorData.presiune);

    
    if (sensorData.pompa != null) point.booleanField("pompa", sensorData.pompa);
    if (sensorData.ventilator != null) point.booleanField("ventilator", sensorData.ventilator);
    if (sensorData.lumini != null) point.booleanField("lumini", sensorData.lumini);

    
    if (data.timestamp) {
      point.timestamp(new Date(data.timestamp));
    }

    
    pointsBuffer.push(point);
    console.log(`💾 Processed data for device: ${deviceId}`);

  } catch (err) {
    console.error("❌ MQTT message error:", err.message);
  }
});


setInterval(() => {
  if (pointsBuffer.length > 0) {
    const pointsToWrite = pointsBuffer.splice(0, pointsBuffer.length);
    writeApi.writePoints(pointsToWrite);
    writeApi.flush()
      .then(() => console.log(`✅ ${pointsToWrite.length} points written to InfluxDB`))
      .catch(err => console.error("❌ InfluxDB write error:", err.message));
  }
}, 5000);

module.exports = mqttClient;
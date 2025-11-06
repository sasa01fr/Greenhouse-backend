const express = require("express");
const router = express.Router();
const { queryApi } = require("../utils/influx");

// GET /api/devices - List all devices
router.get("/devices", async (req, res) => {
  try {
    const fluxQuery = `
      from(bucket: "greenhouse")
        |> range(start: -24h)
        |> filter(fn: (r) => r._measurement == "senzor")
        |> group(columns: ["device_id"])
        |> distinct(column: "device_id")
    `;

    const devices = [];
    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const row = tableMeta.toObject(values);
      if (row.device_id && row.device_id !== "default_device") {
        devices.push(row.device_id);
      }
    }

    // If no devices found, return at least the default
    if (devices.length === 0) {
      devices.push("default_device");
    }

    res.json([...new Set(devices)]);
  } catch (err) {
    console.error("❌ Error fetching devices:", err);
    res.status(500).json({ error: "Failed to fetch devices" });
  }
});

// GET /api/device/:deviceId/sensors - Get current sensor data
router.get("/device/:deviceId/sensors", async (req, res) => {
  try {
    const { deviceId } = req.params;

    // Get the latest value for each sensor field
    const fluxQuery = `
      from(bucket: "greenhouse")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "senzor" and r.device_id == "${deviceId}")
        |> last()
        |> group(columns: ["_field"])
    `;

    const sensors = {};
    const rows = [];

    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      rows.push(tableMeta.toObject(values));
    }

    // Transform to sensor object
    rows.forEach(row => {
      if (row._field && row._value !== null) {
        sensors[row._field] = row._value;
      }
    });

    const response = {
      device_id: deviceId,
      timestamp: new Date().toISOString(),
      sensors: sensors,
      lastUpdated: new Date().toISOString(),
      online: Object.keys(sensors).length > 0
    };

    res.json(response);
  } catch (err) {
    console.error("❌ Error fetching sensor data:", err);
    res.status(500).json({ error: "Failed to fetch sensor data" });
  }
});

// GET /api/device/:deviceId/sensors/list - Get available sensor types
router.get("/device/:deviceId/sensors/list", async (req, res) => {
  try {
    const { deviceId } = req.params;

    const fluxQuery = `
      from(bucket: "greenhouse")
        |> range(start: -24h)
        |> filter(fn: (r) => r._measurement == "senzor" and r.device_id == "${deviceId}")
        |> group(columns: ["_field"])
        |> distinct(column: "_field")
    `;

    const sensorTypes = [];
    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const row = tableMeta.toObject(values);
      if (row._field) {
        sensorTypes.push(row._field);
      }
    }

    res.json(sensorTypes);
  } catch (err) {
    console.error("❌ Error fetching sensor types:", err);
    res.status(500).json({ error: "Failed to fetch sensor types" });
  }
});

// GET /api/device/:deviceId/graph/:sensorType/:timeRange - Get graph data
router.get("/device/:deviceId/graph/:sensorType/:timeRange", async (req, res) => {
  try {
    const { deviceId, sensorType, timeRange } = req.params;
    
    let fluxQuery;
    let data = [];

    // Helper function to safely convert time to ISO string
    const safeToISOString = (timeValue) => {
      if (!timeValue) return new Date().toISOString();
      if (typeof timeValue === 'string') return timeValue;
      if (typeof timeValue.toISOString === 'function') return timeValue.toISOString();
      // If it's a timestamp or other format, try to create a Date object
      try {
        return new Date(timeValue).toISOString();
      } catch (e) {
        return new Date().toISOString();
      }
    };

    // Helper function to safely get time for display
    const getTimeLabel = (timeValue) => {
      try {
        const date = typeof timeValue === 'string' ? new Date(timeValue) : timeValue;
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    };

    // Helper function to safely get hours
    const getHours = (timeValue) => {
      try {
        const date = typeof timeValue === 'string' ? new Date(timeValue) : timeValue;
        return date.getHours();
      } catch (e) {
        return new Date().getHours();
      }
    };

    switch (timeRange) {
      case 'realtime':
        // Last 10 values
        fluxQuery = `
          from(bucket: "greenhouse")
            |> range(start: -2h)
            |> filter(fn: (r) => r._measurement == "senzor" and r.device_id == "${deviceId}" and r._field == "${sensorType}")
            |> sort(columns: ["_time"], desc: true)
            |> limit(n: 10)
            |> sort(columns: ["_time"])
        `;
        
        for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
          const row = tableMeta.toObject(values);
          if (row._value !== null && row._value !== undefined) {
            data.push({
              timestamp: safeToISOString(row._time),
              value: parseFloat(row._value),
              timeLabel: getTimeLabel(row._time)
            });
          }
        }
        break;

      case '24h':
        // Hourly averages for 24h
        fluxQuery = `
          from(bucket: "greenhouse")
            |> range(start: -24h)
            |> filter(fn: (r) => r._measurement == "senzor" and r.device_id == "${deviceId}" and r._field == "${sensorType}")
            |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
        `;
        
        for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
          const row = tableMeta.toObject(values);
          if (row._value !== null && row._value !== undefined) {
            const hour = getHours(row._time);
            data.push({
              hour: hour.toString().padStart(2, '0') + ':00',
              value: Math.round(parseFloat(row._value) * 100) / 100,
              timestamp: safeToISOString(row._time)
            });
          }
        }
        
        // Ensure we have 24 data points (fill empty hours if needed)
        if (data.length > 0) {
          const filledData = [];
          const now = new Date();
          for (let i = 23; i >= 0; i--) {
            const targetHour = new Date(now);
            targetHour.setHours(now.getHours() - i);
            const hourStr = targetHour.getHours().toString().padStart(2, '0') + ':00';
            
            const existing = data.find(d => d.hour === hourStr);
            if (existing) {
              filledData.push(existing);
            } else {
              filledData.push({
                hour: hourStr,
                value: null,
                timestamp: targetHour.toISOString()
              });
            }
          }
          data = filledData;
        }
        break;

      case '10d':
        // Daily data - your friend expects day/night structure
        fluxQuery = `
          from(bucket: "greenhouse")
            |> range(start: -10d)
            |> filter(fn: (r) => r._measurement == "senzor" and r.device_id == "${deviceId}" and r._field == "${sensorType}")
            |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
        `;
        
        const hourlyData = [];
        for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
          const row = tableMeta.toObject(values);
          if (row._value !== null && row._value !== undefined) {
            hourlyData.push({
              timestamp: safeToISOString(row._time),
              value: parseFloat(row._value),
              hour: getHours(row._time)
            });
          }
        }

        // Group by day and calculate day/night averages
        const dailyData = {};
        hourlyData.forEach(entry => {
          try {
            const date = new Date(entry.timestamp);
            const dateStr = date.toISOString().split('T')[0];
            const isDay = entry.hour >= 6 && entry.hour < 18; // Day: 6:00-17:59
            
            if (!dailyData[dateStr]) {
              dailyData[dateStr] = {
                day: [],
                night: []
              };
            }
            
            if (isDay) {
              dailyData[dateStr].day.push(entry.value);
            } else {
              dailyData[dateStr].night.push(entry.value);
            }
          } catch (e) {
            console.log('Skipping invalid date entry:', entry);
          }
        });

        // Convert to array format expected by frontend
        const now = new Date();
        for (let i = 9; i >= 0; i--) {
          const targetDate = new Date(now);
          targetDate.setDate(now.getDate() - i);
          const dateStr = targetDate.toISOString().split('T')[0];
          const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'short' });
          
          const dayData = dailyData[dateStr];
          if (dayData) {
            const dayAvg = dayData.day.length > 0 ? 
              dayData.day.reduce((a, b) => a + b, 0) / dayData.day.length : null;
            const nightAvg = dayData.night.length > 0 ? 
              dayData.night.reduce((a, b) => a + b, 0) / dayData.night.length : null;
            
            data.push({
              day: dayName,
              date: dateStr,
              dayValue: dayAvg ? Math.round(dayAvg * 100) / 100 : null,
              nightValue: nightAvg ? Math.round(nightAvg * 100) / 100 : null,
              timestamp: targetDate.toISOString()
            });
          } else {
            // No data for this day
            data.push({
              day: dayName,
              date: dateStr,
              dayValue: null,
              nightValue: null,
              timestamp: targetDate.toISOString()
            });
          }
        }
        break;

      default:
        return res.status(400).json({ error: 'Invalid time range' });
    }

    res.json({
      deviceId,
      sensorType,
      timeRange,
      data: data,
      generatedAt: new Date().toISOString()
    });
    
    console.log(`📊 Sent graph data: ${deviceId}/${sensorType}/${timeRange} (${data.length} points)`);
    
  } catch (err) {
    console.error("❌ Error fetching graph data:", err);
    console.error("Error details:", err.message);
    res.status(500).json({ error: "Failed to fetch graph data: " + err.message });
  }
});

// Temporary debug route - remove after testing
router.get("/debug/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const fluxQuery = `
      from(bucket: "greenhouse")
        |> range(start: -24h)
        |> filter(fn: (r) => r._measurement == "senzor" and r.device_id == "${deviceId}")
        |> group(columns: ["_field"])
        |> count()
    `;

    const counts = {};
    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const row = tableMeta.toObject(values);
      if (row._field) {
        counts[row._field] = row._value;
      }
    }

    res.json({
      deviceId,
      dataPoints: counts,
      message: Object.keys(counts).length === 0 ? "No data found for this device" : "Data found"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
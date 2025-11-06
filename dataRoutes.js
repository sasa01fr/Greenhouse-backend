// GET /api/device/:deviceId/graph/:sensorType/:timeRange - Get graph data
router.get("/device/:deviceId/graph/:sensorType/:timeRange", async (req, res) => {
  try {
    const { deviceId, sensorType, timeRange } = req.params;
    
    let fluxQuery;
    let data = [];

    switch (timeRange) {
      case 'realtime':
        // Last 10 values - your friend's frontend expects specific format
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
              timestamp: row._time.toISOString(),
              value: parseFloat(row._value),
              timeLabel: new Date(row._time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
          }
        }
        break;

      case '24h':
        // Hourly averages for 24h - your friend expects "hour" and "value" fields
        fluxQuery = `
          from(bucket: "greenhouse")
            |> range(start: -24h)
            |> filter(fn: (r) => r._measurement == "senzor" and r.device_id == "${deviceId}" and r._field == "${sensorType}")
            |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
        `;
        
        for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
          const row = tableMeta.toObject(values);
          if (row._value !== null && row._value !== undefined) {
            const time = new Date(row._time);
            data.push({
              hour: time.getHours().toString().padStart(2, '0') + ':00',
              value: Math.round(parseFloat(row._value) * 100) / 100, // 2 decimal places
              timestamp: row._time.toISOString()
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
              timestamp: row._time.toISOString(),
              value: parseFloat(row._value),
              hour: new Date(row._time).getHours()
            });
          }
        }

        // Group by day and calculate day/night averages
        const dailyData = {};
        hourlyData.forEach(entry => {
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
    res.status(500).json({ error: "Failed to fetch graph data: " + err.message });
  }
});
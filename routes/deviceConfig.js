const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, '../device_configs');
const CONFIG_FILE = path.join(CONFIG_DIR, 'device_configs.json');

// Initialize device configs on startup
const initializeDeviceConfigs = () => {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    console.log('📁 Created device configs directory');
  }
  
  if (!fs.existsSync(CONFIG_FILE)) {
    const initialConfigs = {
      // Default configuration for common devices
      "default_device": {
        "plantType": "Tomato",
        "plantColor": "#ff6b6b",
        "minTemperature": 18,
        "maxTemperature": 28,
        "minHumidity": 40,
        "maxHumidity": 70,
        "minMoisture": 30,
        "maxMoisture": 80,
        "alertsEnabled": true
      }
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(initialConfigs, null, 2));
    console.log('📁 Created device configurations file with default device');
  }
};

// Initialize on module load
initializeDeviceConfigs();

const readDeviceConfigs = () => {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      initializeDeviceConfigs(); // Recreate if missing
      return {};
    }
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (error) {
    console.error('Error reading device configs:', error);
    return {};
  }
};

const writeDeviceConfigs = (configs) => {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(configs, null, 2));
};

// GET /device-configs
const getDeviceConfigs = (req, res) => {
  try {
    const configs = readDeviceConfigs();
    console.log('📋 Returning device configs:', Object.keys(configs));
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /device-configs
const updateDeviceConfigs = (req, res) => {
  try {
    const newConfigs = req.body;
    writeDeviceConfigs(newConfigs);
    console.log('💾 Saved device configurations:', Object.keys(newConfigs));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /device/:deviceId/config
const getDeviceConfig = (req, res) => {
  try {
    const { deviceId } = req.params;
    const configs = readDeviceConfigs();
    const config = configs[deviceId] || {};
    
    console.log(`📋 Config requested for ${deviceId}:`, config);
    
    // If no config exists for this device, create a default one
    if (Object.keys(config).length === 0) {
      const defaultConfig = {
        plantType: "General Plant",
        plantColor: "#4ecdc4",
        minTemperature: 15,
        maxTemperature: 30,
        minHumidity: 35,
        maxHumidity: 75,
        minMoisture: 25,
        maxMoisture: 85,
        alertsEnabled: true,
        deviceName: deviceId
      };
      
      // Save the default config
      configs[deviceId] = defaultConfig;
      writeDeviceConfigs(configs);
      console.log(`📝 Created default config for ${deviceId}`);
      
      res.json(defaultConfig);
    } else {
      res.json(config);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /device/:deviceId/config
const updateDeviceConfig = (req, res) => {
  try {
    const { deviceId } = req.params;
    const config = req.body;
    
    console.log(`💾 Updating config for ${deviceId}:`, config);
    
    const configs = readDeviceConfigs();
    configs[deviceId] = {
      ...configs[deviceId], // Keep existing settings
      ...config, // Update with new settings
      lastUpdated: new Date().toISOString()
    };
    writeDeviceConfigs(configs);
    
    res.json({ success: true, message: `Configuration updated for ${deviceId}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getDeviceConfigs,
  updateDeviceConfigs,
  getDeviceConfig,
  updateDeviceConfig
};
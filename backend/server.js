require('dotenv').config({ path: '../.env' });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mqtt = require('mqtt');
const cors = require('cors');
const mongoose = require('mongoose'); // <-- New Mongoose import

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com:1883';
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'griet/cnc/telemetry';
const IS_MOCK_MODE = process.env.MOCK === 'true';

// -------------------------------------------------------------------
// DATABASE INTEGRATION (MongoDB)
// -------------------------------------------------------------------
console.log(`[DB] Connecting to MongoDB...`);
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas!'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err.message));

// Define the Schema for IoT Time-Series Data
const telemetrySchema = new mongoose.Schema({
    serial_no: String,
    status: String,
    temp: Number,
    vibration_x: Number,
    vibration_y: Number,
    vibration_z: Number,
    timestamp: { type: Date, default: Date.now },
    is_anomaly: { type: Boolean, default: false }
}, { 
    timeseries: { 
        timeField: 'timestamp', 
        metaField: 'serial_no', 
        granularity: 'seconds' 
    } 
});

const Telemetry = mongoose.model('Telemetry', telemetrySchema);

// -------------------------------------------------------------------
// API ROUTES (For Frontend History Fetch)
// -------------------------------------------------------------------
app.get('/api/history', async (req, res) => {
    try {
        // Fetch the last 50 data points, sorted from oldest to newest
        const history = await Telemetry.find().sort({ timestamp: -1 }).limit(50);
        res.json(history.reverse());
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// -------------------------------------------------------------------
// MQTT CLIENT & MOCK PRODUCER
// -------------------------------------------------------------------
let latestMLAlert = false;

// Function to save and broadcast data
async function processTelemetry(payload) {
    payload.is_anomaly = latestMLAlert;
    // Broadcast instantly for zero-latency UI
    io.emit('telemetry_stream', payload);

    // Save to Database asynchronously so it doesn't block the stream
    try {
await Telemetry.create({
            ...payload,
            timestamp: new Date(payload.timestamp) // Ensure proper Date object
        });
    } catch (err) {
        console.error('[DB] Error saving telemetry:', err.message);
    }
}

if (!IS_MOCK_MODE) {
    console.log(`[MQTT] Connecting to ${MQTT_BROKER_URL}...`);
    const client = mqtt.connect(MQTT_BROKER_URL);

    client.on('connect', () => {
        console.log(`[MQTT] Connected to ${MQTT_BROKER_URL}`);
        client.subscribe([MQTT_TOPIC, 'griet/cnc/alerts'], (err) => {
            if (!err) console.log(`[MQTT] Subscribed to telemetry and alerts!`);
        });
    });

    client.on('message', (topic, message) => {
        try {
            const payload = JSON.parse(message.toString());
            
            if (topic === 'griet/cnc/alerts') {
                console.log(`[AI] RED ALERT RECEIVED! Score: ${payload.score}`);
                latestMLAlert = true;
                io.emit('ml_alert', payload);
                setTimeout(() => { latestMLAlert = false; }, 3000);
            } else if (topic === MQTT_TOPIC) {
                processTelemetry(payload);
            }
        } catch (error) {
            console.error('[MQTT] Error parsing message:', error.message);
        }
    });
}

if (IS_MOCK_MODE) {
    console.log('[SYSTEM] MOCK MODE is ON. Generating fake CNC telemetry...');
    
    let cycleCount = 0;
    setInterval(() => {
        cycleCount++;
        const isAnomaly = (cycleCount % 20 === 0);

        const mockData = {
            serial_no: "MOCK-CNC-100",
            status: "RUNNING",
            temp: parseFloat((30.0 + Math.random() * 15.0).toFixed(2)),
            vibration_x: isAnomaly ? parseFloat((2.0 + Math.random() * 0.8).toFixed(3)) : parseFloat((0.1 + Math.random() * 0.4).toFixed(3)),
            vibration_y: parseFloat((0.1 + Math.random() * 0.4).toFixed(3)),
            vibration_z: parseFloat((0.1 + Math.random() * 0.4).toFixed(3)),
            timestamp: Date.now(),
            isMock: true
        };

        if (isAnomaly) console.log('[MOCK] ⚠️ Anomaly Spike Generated!');
        
        processTelemetry(mockData);
    }, 500); 
}

// -------------------------------------------------------------------
// SOCKET.IO & SERVER START
// -------------------------------------------------------------------
io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);
});

server.listen(PORT, () => {
    console.log(`\n🚀 Node.js Backend Server running on port ${PORT}\n`);
});

#!/bin/bash

# --- Reset backend dacă rulează deja ---
echo "🔄 Verific dacă există procese Node ale greenhouse-backend..."
PIDS=$(pgrep -f "node.*greenhouse-backend")

if [ ! -z "$PIDS" ]; then
    echo "⚠️  Oprire procese existente: $PIDS"
    kill -9 $PIDS
    sleep 1
else
    echo "✅ Nu există procese vechi ale greenhouse-backend."
fi

echo "🚀 Pornire InfluxDB..."



echo "🚀 Pornire MQTT broker..."



echo "🚀 Pornire greenhouse-backend..."
cd greenhouse-backend
nohup node server.js > backend.log 2>&1 &

echo "✅ Toate serviciile au fost pornite."

const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://broker.hivemq.com'); 

client.on('connect', () => {
  console.log('✅ MQTT connected');
  client.subscribe('irrigation/+/telemetry');
});

client.on('message', (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    console.log('📩 MQTT', topic, data);
  } catch (e) {
    console.error('MQTT parse error');
  }
});

module.exports = client;

//מגשים המטלה 
//נור נוגידאת 212812358
//מוחמד חטיב 213471634

require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const path = require("path");
const routes = require("./routes");

const irrigation = require("./services/irrigationService");
const mqttHandler = require("./mqtt/handler");
const scheduler = require("./services/scheduler");

const PORT = process.env.PORT || 3000;

// Create an express app
const app = express();

app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json());

// Log all requests
app.use(morgan("dev"));

// Enable CORS
app.use(cors());

// All routes
app.use("/", routes);

// Init DB schema + MQTT handler + scheduler
(async () => {
  try {
    await irrigation.init();
    mqttHandler.start();
    scheduler.start();
  } catch (e) {
    console.error("Startup init error:", e.message);
  }
})();

app.listen(PORT, () => {
  console.log(`The server is running on port: ${PORT}....`);
});

// טעינת ספריות
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const mysql = require("mysql2/promise");
require("dotenv").config();

// יצירת האפליקציה
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

async function connectDB() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST || "localhost",
            user: process.env.DB_USER || "root",
            password: process.env.DB_PASS || "",
            database: process.env.DB_NAME || "test"
        });

        console.log("MySQL connected");
        return db;
    } catch (err) {
        console.error("❌ MySQL Connection Error:", err.message);
        process.exit(1);
    }
}

app.get("/", (req, res) => {
    res.send("Server is running with Express + Morgan + Dotenv + MySQL");
});

app.get("/users", async (req, res) => {
    try {
        const db = await connectDB();
        const [rows] = await db.execute("SELECT * FROM users");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});

require("dotenv").config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const routes = require("./routes")
require('./mqtt/client');

const port = process.env.pory || 3671;
const app = express();

app.use(express.static(path.join(__dirname,"../public"))); 
app.use(express.json());

app.use(morgan("dev"));
app.use(cors());
app.use("/",routes);


app.listen(port, () => {            
    console.log(`The server is running on port${port}....`);
});
require('./config/db');

const express = require("express");
const app = express();
const pool = require("./config/db.js");
const cors = require("cors");

// middle ware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
    res.send(200);
})

app.use("/clinic", require("./routes/routes.clinic"));
app.use("/employees", require("./routes/routes.profiles"));
app.use("/parent", require("./routes/routes.parent"));


module.exports = app;
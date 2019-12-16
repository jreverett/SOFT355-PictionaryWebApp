const http = require('http');
const express = require("express");
const socket_io = require('socket.io');
const mongoose = require("mongoose");
mongoose.set("useCreateIndex", true);

require("dotenv").config();

// server settings
const app = express();
const port = process.env.PORT;
app.use(express.json());

// SOCKET.IO /////////////////////////////
// create server instance
const server = http.createServer(app);
// create socket
const io = socket_io.listen(server);

io.on('connection', socket => {
  console.log('[socket.io] connection established');

  socket.on('disconnect', () => {
    console.log('[socket.io] connection terminated');
  });
});
///////////////////////////////////////////

// MONGODB ////////////////////////////////
// setup connection string
var dbConn = mongoose.connection;
const mongoString = process.env.MONGODB_URL;
///////////////////////////////////////////

// setup listeners
dbConn.on("error", console.error.bind(console, "connection error: "));

dbConn.once("open", function () {
  console.log("connection established with MongoDB");
});

// REST api routing ////////////////////////////////////
const user = require("./route/user/index");

app.use("/api/user", user);

// homepage
app.use(express.static("public"));

////////////////////////////////////////////////////////


server.listen(port, () => {
  console.log(`Pictionary app listening on port ${port}`);
  mongoose.connect(mongoString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

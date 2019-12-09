var express = require("express");
var mongoose = require("mongoose");

// server settings
const app = express();
const port = 9000;
app.use(express.json());

// setup connection string
var dbConn = mongoose.connection;
const mongoString =
  "mongodb+srv://TestUser:Password1!@soft355-pictionary-gx8rh.azure.mongodb.net/test?retryWrites=true&w=majority";

// setup listeners
dbConn.on("error", console.error.bind(console, "connection error: "));

dbConn.once("open", function() {
  console.log("connection established with MongoDB");
});

// REST api routing
app.get("/", (req, res) => res.send("Hello World!"));

// app.listen
app.listen(port, () => {
  console.log(`Pictionary app listening on port ${port}`);
  mongoose.connect(mongoString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

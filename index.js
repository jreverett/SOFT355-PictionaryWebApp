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

// MONGODB ////////////////////////////////
// setup connection string
var db = mongoose.connection;
const mongoString = process.env.MONGODB_URL;

var wordSchema = new mongoose.Schema({ name: String });
var Word = mongoose.model('Word', wordSchema);
///////////////////////////////////////////

// setup listeners
db.on("error", console.error.bind(console, "connection error: "));

db.once("open", function () {
  console.log("[mongodb] connection established with MongoDB");
});

// REST api routing ////////////////////////////////////
const user = require("./route/user/index");

app.use("/api/user", user);

// homepage
app.use(express.static("public"));

////////////////////////////////////////////////////////

// SOCKET.IO /////////////////////////////
var clients = []; // an array of all the currently connected users

// create server instance
const server = http.createServer(app);
// create socket
const io = socket_io.listen(server);

io.on('connection', socket => {
  socket.on('guestConnection', (username) => {
    socket.username = username;

    // add the client to the array of connected clients
    var clientObj = { id: socket.id, name: socket.username };
    clients.push(clientObj);
    console.log('[socket.io] guest \'' + socket.username + '\' joined (ID: ' + socket.id + ')');

    // if this is the first 
    if (clients.length === 1) {
      socket.join('drawer');
      io.to('drawer').emit('assign drawer');

      // send a random word to the drawer room
      emitRandomWord();

      console.log('[socket.io] ' + socket.username + ' is the drawer');
    }
    else {
      // any other users will be added as guessers
      socket.join('guesser');

      io.in(socket.id).emit('assign guesser', socket.id);
      console.log('[socket.io] ' + socket.username + 'is a guesser');
    }
  });

  socket.on('disconnect', () => {
    // remove the connection from the clients array
    var index = clients.findIndex(x => x.id === socket.id);
    clients.splice(index, 1);
    console.log('[socket.io] connection terminated with ' + socket.username);
  });
});

///////////////////////////////////////////

function emitRandomWord() {
  Word.countDocuments().exec(function (err, count) {
    // RNG to get a number between 1 and num documents
    var random = Math.floor(Math.random() * count);

    // find and return the randomly selected document
    Word.findOne().skip(random).exec(
      function (err, word) {
        io.to('drawer').emit('issue word', word.name);
      }
    )
  });
}

server.listen(port, () => {
  console.log(`Pictionary app listening on port ${port}`);
  mongoose.connect(mongoString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

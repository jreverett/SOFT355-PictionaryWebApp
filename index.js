// Dependencies ////////////////////////////////
const http = require('http');
const express = require('express');
const socket_io = require('socket.io');
const mongoose = require('mongoose');
mongoose.set('useCreateIndex', true);

require('dotenv').config();

// const timeUtils = require('./utils/index').Time;

// Server settings
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
db.on('error', console.error.bind(console, 'connection error: '));

db.once('open', function() {
  console.log('[mongodb] connection established with MongoDB');
});

// REST api routing ////////////////////////////////////
const user = require('./route/user/index');
app.use('/api/user', user);

// homepage
app.use(express.static('public'));

////////////////////////////////////////////////////////

// SOCKET.IO /////////////////////////////
var clients = []; // an array of all the currently connected users
var winners = [];

const server = http.createServer(app); //server instance
const io = socket_io.listen(server); // create socket

var targetWord; // word to be guessed
var currDrawer; // the current drawer socket

io.on('connection', socket => {
  console.log('[socket.io] connection established with ' + socket.id);

  socket.on('guest connection', username => {
    socket.username = username;

    // add the client to the array of connected clients
    var clientObj = { id: socket.id, name: socket.username };
    clients.push(clientObj);
    console.log(
      "[socket.io] guest '" +
        socket.username +
        "' joined (ID: " +
        socket.id +
        ')'
    );

    // if this is the first player to connect, they are the drawer
    if (clients.length === 1) {
      currDrawer = socket;
      socket.join('drawer');
      io.to('drawer').emit('assign drawer');

      // send a random word to the drawer room
      emitRandomWord();

      console.log('[socket.io] ' + socket.username + ' is the drawer');
    } else {
      // any other users will be added as guessers
      socket.join('guesser');

      io.in(socket.id).emit('assign guesser', socket.id);
      console.log('[socket.io] ' + socket.username + ' is a guesser');
    }
  });

  socket.on('send message', (message, callback) => {
    var guess = message.toLowerCase();
    targetWord = targetWord.toLowerCase();

    if (
      guess === targetWord &&
      !winners.includes(socket.id) &&
      socket.id !== currDrawer.id
    ) {
      // guesser has correctly identified the drawing
      winners.push(socket.id);

      var pointsGiven;
      switch (winners.length) {
        case 1:
          // 1st place
          pointsGiven = 5;
          break;
        case 2:
          // 2nd place
          pointsGiven = 3;
          break;
        case 3:
          // 3rd place
          pointsGiven = 2;
          break;
        default:
          // anything else
          pointsGiven = 1;
          break;
      }

      message =
        '[server] ' +
        socket.username +
        ' correctly guessed the word! (+' +
        pointsGiven +
        ')';
    } else {
      // may add timestamps back in later, removing to reduce chat box clutter
      // message = "[" + timeUtils.getTimestamp() + "] " + socket.username + ': ' + message;
      message = '[' + socket.username + '] ' + message;
    }

    io.emit('update messages', message);
    callback();
  });

  socket.on('disconnect', () => {
    // remove the connection from the clients array
    var index = clients.findIndex(x => x.id === socket.id);
    clients.splice(index, 1);
    console.log('[socket.io] connection terminated with ' + socket.id);
  });
});

///////////////////////////////////////////

function emitRandomWord() {
  Word.countDocuments().exec(function(err, count) {
    // RNG to get a number between 1 and num documents
    var random = Math.floor(Math.random() * count);

    // find and return the randomly selected document
    Word.findOne()
      .skip(random)
      .exec(function(err, word) {
        targetWord = word.name;
        io.to('drawer').emit('issue word', targetWord);
      });
  });
}

server.listen(port, () => {
  console.log(`Pictionary app listening on port ${port}`);
  mongoose.connect(mongoString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

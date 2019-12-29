// Dependencies ////////////////////////////////
const http = require('http');
const express = require('express');
const path = require('path');
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

app.use('/vendors', express.static('vendors'));

// homepage
app.use(express.static(path.join(__dirname, 'public')));

////////////////////////////////////////////////////////

// SOCKET.IO /////////////////////////////
var clients = []; // all the currently connected users
var winners = []; // guessers who have answered correctly
var lineHistory = []; // all lines drawn this round

const server = http.createServer(app); //server instance
const io = socket_io.listen(server); // create socket

var targetWord; // word to be guessed

io.on('connection', socket => {
  console.log('[socket.io] connection established with ' + socket.id);

  // update the connection with the current drawing
  lineHistory.forEach(line => {
    socket.emit('draw line', line);
  });

  socket.on('guest connection', username => {
    socket.username = username;

    var clientObj = { id: socket.id, username: socket.username };

    // prevents duplicate connections
    if (clients.some(e => e.id === socket.id)) return;

    // add the client to the array of connected clients
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
      assignNewDrawer(socket);

      // send a random word to the drawer room
      emitRandomWord();
    } else {
      // any other users will be added as guessers
      socket.join('guessers');

      io.in(socket.id).emit('assign guesser', socket.id);
      console.log('[socket.io] assigned guesser role to ' + socket.username);

      // starts a game, ends the game, assigns a new drawer, repeats
      gameLoop();
    }
  });

  socket.on('send message', (message, callback) => {
    var guess = message.toLowerCase();
    targetWord = targetWord.toLowerCase();

    var msgClass = 'chatMessage';

    if (
      guess === targetWord &&
      !winners.some(e => e.id === socket.id) &&
      socket.id !== getDrawerSocket().id
    ) {
      // guesser has correctly identified the drawing
      var winnerObj = { id: socket.id, name: socket.username };
      winners.push(winnerObj);

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

      msgClass = msgClass + ' chatCorrect';

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

    // hide the word!
    message = message.replace(targetWord, '*****');

    var element = "<p class='" + msgClass + "'>" + message + '</p>';

    io.emit('update messages', element);
    callback();
  });

  socket.on('draw line', function(line) {
    // only the drawer can issue this command
    if (!socketIsDrawer(socket)) return;

    // add the incoming line to history and emit it
    lineHistory.push(line);
    io.to('guessers').emit('draw line', line);
  });

  socket.on('clear canvas', () => {
    // only the drawer can issue this command
    if (socketIsDrawer(socket)) {
      resetCanvases();
    }
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

function gameLoop() {
  // starts a game then assigns a new drawer
  console.log('starting round...');

  var end = new Date();
  end.setSeconds(end.getSeconds() + 30);

  // countdown timer for 1 minute
  var timer = setInterval(function() {
    var now = new Date().getTime();
    var delta = end - now;
    var seconds = Math.floor((delta % (1000 * 60)) / 1000);

    io.emit('update timer', seconds);

    if (seconds === 0) {
      clearInterval(timer);

      if (clients.length > 1) {
        resetRound();
      } else {
        var waitForPlayers = setInterval(function() {
          console.log('[socket.io] waiting for players');
          if (clients.length > 1) {
            clearInterval(waitForPlayers);

            resetRound();
          }
        }, 1000);
      }
    }
  }, 1000);
}

function assignNewDrawer(newDrawer) {
  var previousDrawer = getDrawerSocket();

  // if the previous drawer socket exists
  if (previousDrawer) {
    // move current drawer to the guessers room...
    previousDrawer.leave('drawer');
    io.sockets.connected[previousDrawer.id].join('guessers');

    io.to(previousDrawer.id).emit('assign guesser');
    console.log(
      '[socket.io] assigned guesser role to ' + previousDrawer.username
    );
  }

  // and the new drawer to the drawer room
  io.sockets.connected[newDrawer.id].leave('guessers');
  io.sockets.connected[newDrawer.id].join('drawer');

  io.to(newDrawer.id).emit('assign drawer');
  console.log('[socket.io] assigned drawer role to ' + newDrawer.username);

  // notify users of the new drawer
  var message = '[server] ' + newDrawer.username + ' is the drawer!';

  var element = "<p class='chatMessage chatImportant'>" + message + '</p>';

  io.emit('update messages', element);
}

function resetRound() {
  // 1st place is the new drawer, if nobody got it, pick a random client
  if (winners.length !== 0) {
    assignNewDrawer(winners[0]);
  } else if (clients.length !== 0) {
    var rand = Math.floor(Math.random() * clients.length);
    assignNewDrawer(clients[rand]);
  } else {
    console.log('[socket.io] insufficient players, ending game');
    return;
  }

  // end of the round so clear the winners array
  winners = [];

  // also clear all canvases
  resetCanvases();

  emitRandomWord();

  // start another round
  gameLoop();
}

function resetCanvases() {
  lineHistory = [];
  io.emit('clear canvas');
}

// UTILITIES //////////////////////////////
function getDrawerSocket() {
  // returns the drawer socket, or false if there isnt one
  var drawerRoom = io.sockets.adapter.rooms['drawer'];

  // check the drawer room exists
  if (drawerRoom === undefined || drawerRoom.length === 0) return false;
  else {
    var drawerID = Object.keys(drawerRoom.sockets);
    return io.sockets.connected[drawerID];
  }
}

function socketIsDrawer(socket) {
  var drawer = getDrawerSocket();

  if (drawer && drawer.id == socket.id) return true;
  else return false;
}
////////////////////////////////////////////

server.listen(port, () => {
  console.log(`Pictionary app listening on port ${port}`);
  mongoose.connect(mongoString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

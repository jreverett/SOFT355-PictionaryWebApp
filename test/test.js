const server = require('../index');
const io = require('socket.io-client');
const request = require('request');
const expect = require('chai').expect;
const jsdom = require('jsdom');

describe('Status tests', function() {
  it('should return status 200 for main.js', function(done) {
    request('http://localhost:9000', function(err, res, body) {
      expect(res.statusCode).to.equal(200);
      done();
    });
  });
});

describe('DOM tests', function() {
  // setup jsdom
  var jswindow;
  request('http://localhost:9000', function(err, res, body) {
    jswindow = new jsdom.JSDOM(body).window;
  });

  it('should show the account prompt on inital connection', function(done) {
    var prompt = jswindow.document.getElementById('signinContainer');
    var visibility = jswindow.getComputedStyle(prompt).visibility;
    expect(visibility).to.equal('visible');
    done();
  });

  it('should show the timer with 60 seconds remaining', function(done) {
    var timerValue = jswindow.document.getElementById('timer').textContent;
    expect(timerValue).to.equal('60');
    done();
  });

  it('should show thickness slider set to 6', function(done) {
    var thickness = jswindow.document.getElementById('weightSlider').value;
    expect(thickness).to.equal('6');
    done();
  });

  it('should show guesser text by default', function(done) {
    var guesserElement = jswindow.document.getElementById('coverText')
      .outerHTML;
    expect(guesserElement).to.equal('<p id="coverText">You\'re a guesser!</p>');
    done();
  });

  it('should show eraser unselected by default', function(done) {
    var eraser = jswindow.document.getElementById('eraser');
    var isSelected = eraser.classList.contains('selected');
    expect(isSelected).to.equal(false);
    done();
  });
});

describe('Account tests', function() {
  // dummy user data
  var postData = {
    name: 'test',
    email: 'testemail@email.com',
    accountType: 1,
    password: 'PleaseHashMe'
  };

  it('should create a user account', function(done) {
    var url = 'http://localhost:9000/api/user/signup';
    var options = {
      method: 'post',
      body: postData,
      json: true,
      url: url
    };

    request(options, function(err, res, body) {
      if (err) done(new Error(err));

      expect(res.statusCode).to.equal(201); // HTTP: CREATED
      done();
    });
  });

  it('should login to a user account', function(done) {
    var url = 'http://localhost:9000/api/user/login';
    var options = {
      method: 'post',
      body: postData,
      json: true,
      url: url
    };

    request(options, function(err, res, body) {
      if (err) done(new Error(err));

      expect(res.statusCode).to.equal(200); // HTTP: SUCCESS
      done();
    });
  });

  it('should delete a user account', function(done) {
    var url = 'http://localhost:9000/api/user/delete';
    var options = {
      method: 'post',
      body: postData,
      json: true,
      url: url
    };

    request(options, function(err, res, body) {
      if (err) done(new Error(err));

      expect(res.statusCode).to.equal(204); // HTTP: DELETED
      done();
    });
  });
});

describe('Websocket tests', function() {
  // initSocket returns a promise
  // success: resolve a new socket object
  // fail: reject a error
  const initSocket = () => {
    return new Promise((resolve, reject) => {
      // create socket for communication
      const socket = io('http://localhost:9000', {
        'reopen delay': 0,
        'reconnection delay': 0,
        'force new connection': true
      });

      // define event handler for sucessfull connection
      socket.on('connect', () => {
        resolve(socket);
      });

      // if connection takes longer than 5 seconds throw error
      setTimeout(() => {
        reject(new Error('Failed to connect wihtin 5 seconds.'));
      }, 5000);
    });
  };

  // destroySocket returns a promise
  // success: resolve true
  // fail: resolve false
  const destroySocket = socket => {
    return new Promise((resolve, reject) => {
      // check if socket connected
      if (socket.connected) {
        // disconnect socket
        socket.disconnect();
        resolve(true);
      } else {
        // not connected
        resolve(false);
      }
    });
  };

  it('should assign the drawer role to the first socket', async () => {
    // create socket for communication
    const socketClient = await initSocket();

    // create new promise for server response
    const serverResponse = new Promise((resolve, reject) => {
      // define a handler for the test event
      socketClient.on('assign drawer', () => {
        // destroy socket after server responds
        destroySocket(socketClient);

        // return data for testing
        resolve('drawer');
      });

      // if response takes longer than 5 seconds throw error
      setTimeout(() => {
        reject(new Error('Failed to get reponse, connection timed out...'));
      }, 5000);
    });

    // trigger role assignment from the server
    socketClient.emit('guest connection', 'John Tester');

    // wait for server to respond
    const assignedRole = await serverResponse;

    // check the response data
    expect(assignedRole).to.equal('drawer');
  });

  it('should assign the guesser role to the second socket', async () => {
    // create socket for communication
    const socketClientDraw = await initSocket();
    const socketClientGuess = await initSocket();

    // create new promise for server response
    const serverResponse = new Promise((resolve, reject) => {
      // define a handler for the test event
      socketClientGuess.on('assign guesser', () => {
        // destroy socket after server responds
        destroySocket(socketClientDraw);
        destroySocket(socketClientGuess);

        // return data for testing
        resolve('guesser');
      });

      // if response takes longer than 5 seconds throw error
      setTimeout(() => {
        reject(new Error('Failed to get reponse, connection timed out...'));
      }, 5000);
    });

    // trigger role assignment from the server
    socketClientDraw.emit('guest connection', 'Greg Drawer');
    socketClientGuess.emit('guest connection', 'Steve Guesser');

    // wait for server to respond
    const assignedRole = await serverResponse;

    // check the response data
    expect(assignedRole).to.equal('guesser');
  });
});

after(() => {
  server.close();
});

// Tests TODO:
// check only drawer can issue clear canvas and draw line
// load test sending many messages, on each update messages add to array, check array length. timeout 5s(?)

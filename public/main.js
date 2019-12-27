// Data structures ///////////
const BrushMode = Object.freeze({ PAINT: 1, ERASE: 2 });

//////////////////////////////
// Globar variables
var socket = io();
var user; // this user
var users = []; // array of all users in the session
var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');

var brush = {
  active: false,
  moving: false,
  mode: BrushMode.PAINT,
  pos: { x: 0, y: 0 },
  prevPos: false
  // TODO: pass colour, thickness etc. here
};

var roundHasFinished;

$(function() {
  //////////////////////////////
  // Setup functions
  resizeCanvas();
  initialPrompt();

  //////////////////////////////
  // Socket.io listeners
  socket.on('assign drawer', initDrawer);
  socket.on('issue word', issueWord);
  socket.on('assign guesser', initGuesser);
  socket.on('update messages', updateMessages);
  socket.on('clear canvas', clearCanvas);
  socket.on('correct guess', correctGuess);
  socket.on('draw line', drawLine);

  //////////////////////////////
  // Event listeners
  $(window).resize(function() {
    resizeCanvas();
  });

  //////////////////////////////
  // Canvas functions
  brush.active = false;
  brush.mode = BrushMode.PAINT; // painting or erasing
  brush.pos = { x: 0, y: 0 };
  var container = $('#canvasContainer');

  // default line styling
  context.lineWidth = 3;
  context.strokeStyle = '#000000';
  context.lineCap = 'round';
  context.lineJoin = 'round';

  container.mousedown(function(e) {
    brush.active = true;

    // get mouse pos
    brush.pos.x = e.pageX - this.offsetLeft;
    brush.pos.y = e.pageY - this.offsetTop;

    context.beginPath();
    context.moveTo(brush.pos.x, brush.pos.y);
  });

  var lastEmit = $.now();

  container.mousemove(function(e) {
    // limit packet sending to every 25ms
    if ($.now() - lastEmit < 25) return;

    // get mouse pos
    brush.pos.x = e.pageX - this.offsetLeft;
    brush.pos.y = e.pageY - this.offsetTop;

    brush.moving = true;

    if (brush.active == true) {
      if (brush.mode == BrushMode.PAINT)
        // TODO: get line colour
        context.strokeStyle = 'red';
      else if (brush.mode == BrushMode.ERASE)
        // white (to erase)
        context.strokeStyle = 'white';

      if (brush.prevPos) {
        socket.emit('draw line', { line: [brush.pos, brush.prevPos] });

        context.lineTo(brush.pos.x, brush.pos.y);
        context.stroke();
      }

      brush.prevPos = { x: brush.pos.x, y: brush.pos.y };
    }
  });

  container.mouseup(function() {
    brush.active = false;
    brush.prevPos = false;
  });

  container.mouseleave(function() {
    brush.active = false;
  });

  $('#eraser').click(function() {
    $(this).toggleClass('selected');

    if (brush.mode == BrushMode.PAINT) brush.mode = BrushMode.ERASE;
    else brush.mode = BrushMode.PAINT;
  });

  $('#clear').click(function() {
    clearCanvas();
    socket.emit('clear canvas');
    brush.mode = BrushMode.PAINT;
    $('#eraser').removeClass('selected');
  });

  //////////////////////////////
  // Chat functions
  $('#chatInput').submit(function() {
    event.preventDefault();
    var $message = $('#messageText');

    if ($message.val() == '') return;

    // send the message, clear the text field and scroll down to the new message
    socket.emit('send message', $message.val(), function() {
      $message.val('');

      var chatDiv = $('#chatHistory');
      var lastMessage = chatDiv.children().last();
      chatDiv.scrollTop(lastMessage.offset().top - chatDiv.offset().top);
    });
  });
});

// resize the canvas to match the current container size
function resizeCanvas() {
  var canvas = document.getElementById('canvas');
  var parent = canvas.parentNode.getBoundingClientRect();

  canvas.width = parent.width;
  canvas.height = parent.height;
}

function clearCanvas() {
  context.clearRect(0, 0, canvas.width, canvas.height);
}

// ask the user to sign in as a guest or a full account
function initialPrompt() {
  $('.grey-fade').fadeIn(500);

  // guest account logic
  $('#guestSignin').submit(function() {
    event.preventDefault();
    username = $('#guestUsername')
      .val()
      .trim();

    if (username == '' || username == 'server' || username == 'Server')
      return false;

    socket.emit('guest connection', username);
    $('.grey-fade').fadeOut(300);
    $('#signinContainer').hide();
  });

  // full account logic
  $('#accountSignin').submit(function() {
    event.preventDefault();
    // TODO: account authentication / signup
  });
}

//////////////////////////////
// Socket.io functions
function initDrawer() {
  $('.targetWord').css('display', 'block');
  $('#targetWordCover').css('display', 'none');
  $('#messageText')[0].disabled = true;
  $('#messageSubmit')[0].disabled = true;
}

function issueWord(word) {
  console.log('[socket.io] your target word is: ' + word);
  $('#targetWord').text(word);
}

function initGuesser() {
  $('.targetWord').css('display', 'none');
  $('#targetWordCover').css('display', 'block');
  $('#messageText')[0].disabled = false;
  $('#messageSubmit')[0].disabled = false;
}

function updateMessages(message) {
  var newMessage = $('<p class="chatMessage" />').text(message);
  $('#chatHistory').append(newMessage);
}

function correctGuess() {}

function drawLine(line) {
  context.beginPath();
  context.moveTo(line[0].x, line[0].y);
  context.lineTo(line[1].x, line[1].y);
  context.stroke();
}

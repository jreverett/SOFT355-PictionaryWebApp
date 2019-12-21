// Data structures ///////////
const BrushMode = Object.freeze({ PAINT: 1, ERASE: 2 });

//////////////////////////////
// Globar variables
var socket = io();
var user; // this user
var users = []; // array of all users in the session
var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');

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
  socket.on('correct guess', correctGuess);

  //////////////////////////////
  // Event listeners
  $(window).resize(function() {
    resizeCanvas();
  });

  //////////////////////////////
  // Canvas functions
  var canvasActive = false; // painting or erasing
  var mode = BrushMode.PAINT;
  var container = $('#canvasContainer');
  var mouse = { x: 0, y: 0 };

  // default line styling
  context.lineWidth = 3;
  context.strokeStyle = '#000000';
  context.lineCap = 'round';
  context.lineJoin = 'round';

  container.mousedown(function(e) {
    canvasActive = true;

    // get mouse pos
    mouse.x = e.pageX - this.offsetLeft;
    mouse.y = e.pageY - this.offsetTop;

    context.beginPath();
    context.moveTo(mouse.x, mouse.y);
  });

  container.mousemove(function(e) {
    // get mouse pos
    mouse.x = e.pageX - this.offsetLeft;
    mouse.y = e.pageY - this.offsetTop;

    if (canvasActive == true) {
      if (mode == BrushMode.PAINT)
        // TODO: get line colour
        context.strokeStyle = 'red';
      else if (mode == BrushMode.ERASE)
        // white (to erase)
        context.strokeStyle = 'white';

      context.lineTo(mouse.x, mouse.y);
      context.stroke();
    }
  });

  container.mouseup(function() {
    canvasActive = false;
  });

  container.mouseleave(function() {
    canvasActive = false;
  });

  $('#eraser').click(function() {
    $(this).toggleClass('selected');

    if (mode == BrushMode.PAINT) mode = BrushMode.ERASE;
    else mode = BrushMode.PAINT;
  });

  $('#clear').click(function() {
    clearCanvas();
    mode = BrushMode.PAINT;
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
  clearCanvas();
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

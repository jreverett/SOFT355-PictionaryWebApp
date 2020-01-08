// Data structures ///////////
const BrushMode = Object.freeze({ PAINT: 1, ERASE: 2 });
const PlayerMode = Object.freeze({ DRAWER: 1, GUESSER: 2 });

//////////////////////////////
// Globar variables
var socket = io();
var user; // this user
var users = []; // array of all users in the session
var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');

var prevColour;

var playerMode;

var brush = {
  active: false,
  moving: false,
  mode: BrushMode.PAINT,
  pos: { x: 0, y: 0 },
  prevPos: null,
  lineWidth: 0,
  strokeStyle: null
};

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
  socket.on('draw line', drawLine);
  socket.on('update timer', updateTimer);
  socket.on('update player list', updatePlayerList);

  //////////////////////////////
  // Event listeners
  $(window).resize(function() {
    resizeCanvas();
  });

  var slider = document.getElementById('weightSlider');
  changeLineWidth(slider.value);

  slider.oninput = function() {
    changeLineWidth(this.value);
  };

  //////////////////////////////
  // Canvas functions
  brush.active = false;
  brush.mode = BrushMode.PAINT; // painting or erasing
  brush.pos = { x: 0, y: 0 };
  var container = $('#canvasContainer');

  // default line styling
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

    if (brush.active === true && playerMode === PlayerMode.DRAWER) {
      if (brush.mode === BrushMode.ERASE) {
        // white (to erase)
        context.strokeStyle = '#FFFFFF';
        brush.strokeStyle = '#FFFFFF';
      }

      if (brush.prevPos) {
        // bundle up the line data and send it off
        var line = {
          startPos: brush.prevPos,
          endPos: brush.pos,
          lineWidth: brush.lineWidth,
          strokeStyle: brush.strokeStyle
        };
        socket.emit('draw line', line);

        context.lineTo(brush.pos.x, brush.pos.y);
        context.stroke();
      }

      brush.prevPos = { x: brush.pos.x, y: brush.pos.y };
    }
  });

  container.mouseup(function() {
    context.closePath();
    brush.active = false;
    brush.prevPos = false;
  });

  container.mouseleave(function() {
    brush.active = false;
  });

  //////////////////////////////
  // Palette functions
  $('.paletteColour').click(function() {
    var colour = $(this).css('backgroundColor');
    context.strokeStyle = colour;
    brush.strokeStyle = colour;

    // change out of eraser mode if it's active
    $('#eraser').removeClass('selected');
    brush.mode = BrushMode.PAINT;
    context.lineWidth = context.lineWidth - 5;
  });

  $('#paletteCustomPlaceholder').click(function() {
    $(this).hide();
    $('#paletteCustom').click();
  });

  $('#eraser').click(function() {
    // only drawers can use this function
    if (playerMode === PlayerMode.GUESSER) return;

    $(this).toggleClass('selected');

    // save the selected colour and restore it once the eraser is deselected
    if (brush.mode == BrushMode.PAINT) {
      brush.mode = BrushMode.ERASE;
      prevColour = context.strokeStyle;
      context.lineWidth = context.lineWidth + 5;
    } else {
      brush.mode = BrushMode.PAINT;
      brush.strokeStyle = prevColour;
      context.strokeStyle = prevColour;
      context.lineWidth = context.lineWidth - 5;
    }
  });

  $('#clear').click(function() {
    // only drawers can use this function
    if (playerMode === PlayerMode.GUESSER) return;

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
    else if ($message.val() == '!score') {
      socket.emit('request score', function() {
        $message.val('');
        scrollToNewMessage();
      });

      return;
    }

    // send the message, clear the text field and scroll down to the new message
    socket.emit('send message', $message.val(), function() {
      $message.val('');
      scrollToNewMessage();
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

function changeLineWidth(value) {
  // increase the value for css to make the change more obvious
  $('#weightCircle').css('width', +value + 10);
  $('#weightCircle').css('height', +value + 10);
  context.lineWidth = value; // used locally
  brush.lineWidth = value; // sent to server
}

function updateJSColour(jscolor) {
  context.strokeStyle = '#' + jscolor;
  brush.strokeStyle = '#' + jscolor;
}

function scrollToNewMessage() {
  var chatDiv = $('#chatHistory');
  var lastMessage = chatDiv.children().last();
  chatDiv.scrollTop(lastMessage.offset().top - chatDiv.offset().top);
}

//////////////////////////////
// Socket.io functions
function initDrawer() {
  playerMode = PlayerMode.DRAWER;

  $('.targetWord').css('display', 'block');
  $('#targetWordCover').css('display', 'none');
  $('#messageText')[0].disabled = true;
  $('#messageSubmit')[0].disabled = true;
}

function issueWord(word) {
  console.log('word is: ' + word);
  $('#targetWord').text(word);
}

function initGuesser() {
  playerMode = PlayerMode.GUESSER;

  $('.targetWord').css('display', 'none');
  $('#targetWordCover').css('display', 'block');
  $('#messageText')[0].disabled = false;
  $('#messageSubmit')[0].disabled = false;
}

function updateMessages(message) {
  $('#chatHistory').append(message);
  scrollToNewMessage();
}

function drawLine(line) {
  context.lineWidth = line.lineWidth;
  context.strokeStyle = line.strokeStyle;

  context.beginPath();
  context.moveTo(line.startPos.x, line.startPos.y);
  context.lineTo(line.endPos.x, line.endPos.y);
  context.stroke();
}

function updateTimer(seconds) {
  $('#timer').text(seconds);
}

function updatePlayerList(sortedClientElements) {
  var $playerList = $('#playerList');
  $playerList.empty();

  sortedClientElements.forEach(element => {
    $playerList.append(element);
  });
}

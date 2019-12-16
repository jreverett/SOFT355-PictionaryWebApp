// Data structures ///////////
const BrushMode = Object.freeze({ PAINT: 1, ERASE: 2 });

//////////////////////////////
// Globar variables
var socket = io();
var user;
var users = [];

$(function () {
  //////////////////////////////
  // Setup functions
  resizeCanvas();
  initialPrompt();

  //////////////////////////////
  // Event listeners ///////////
  $(window).resize(function () {
    resizeCanvas();
  });

  //////////////////////////////
  // Canvas functions //////////
  var canvasActive = false; // painting or erasing
  var mode = BrushMode.PAINT;
  var canvas = document.getElementById("canvas");
  var context = canvas.getContext("2d");
  var container = $("#canvasContainer");
  var mouse = { x: 0, y: 0 };

  // default line styling
  context.lineWidth = 3;
  context.strokeStyle = "#000000";
  context.lineCap = "round";
  context.lineJoin = "round";

  container.mousedown(function (e) {
    canvasActive = true;

    // get mouse pos
    mouse.x = e.pageX - this.offsetLeft;
    mouse.y = e.pageY - this.offsetTop;

    context.beginPath();
    context.moveTo(mouse.x, mouse.y);
  });

  container.mousemove(function (e) {
    // get mouse pos
    mouse.x = e.pageX - this.offsetLeft;
    mouse.y = e.pageY - this.offsetTop;

    if (canvasActive == true) {
      if (mode == BrushMode.PAINT)
        // TODO: get line colour
        context.strokeStyle = "red";
      else if (mode == BrushMode.ERASE)
        // white (to erase)
        context.strokeStyle = "white";

      context.lineTo(mouse.x, mouse.y);
      context.stroke();
    }
  });

  container.mouseup(function () {
    canvasActive = false;
  });

  container.mouseleave(function () {
    canvasActive = false;
  });

  $("#eraser").click(function () {
    $(this).toggleClass("selected");

    if (mode == BrushMode.PAINT)
      mode = BrushMode.ERASE;
    else
      mode = BrushMode.PAINT;
  });

  $("#clear").click(function () {
    context.clearRect(0, 0, canvas.width, canvas.height);
    mode = BrushMode.PAINT;
    $("#eraser").removeClass("selected");
  });
  //////////////////////////////
});

// resize the canvas to match the current container size
function resizeCanvas() {
  var canvas = document.getElementById("canvas");
  var parent = canvas.parentNode.getBoundingClientRect();

  canvas.width = parent.width;
  canvas.height = parent.height;
}

// ask the user to sign in as a guest or a full account
function initialPrompt() {
  $('.grey-fade').fadeIn(500);

  // guest account logic
  $("#guestSignin").submit(function () {
    event.preventDefault();
    user = $('#guestUsername').val().trim();

    if (user == '')
      return false;

    socket.emit('connection');
    $('.grey-fade').fadeOut(300);
  });

  // full account logic
  $("#accountSignin").submit(function () {
    event.preventDefault();
    user = $('');
  });
}
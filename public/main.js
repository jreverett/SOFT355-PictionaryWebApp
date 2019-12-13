$(function () {
  // Data structures ///////////
  const BrushMode = Object.freeze({ PAINT: 1, ERASE: 2 });

  //////////////////////////////
  // Setup functions
  resizeCanvas();

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

function resizeCanvas() {
  var canvas = document.getElementById("canvas");
  var parent = canvas.parentNode.getBoundingClientRect();

  canvas.width = parent.width;
  canvas.height = parent.height;
}

$(function() {
  resizeCanvas();

  $("#eraser").click(function() {
    $(this).toggleClass("selected");
  });

  $(window).resize(function() {
    resizeCanvas();
  });

  // canvas drawing
  var canvas = document.getElementById("canvas");
  var context = canvas.getContext("2d");

  context.lineWidth = 20;
  context.strokeStyle = "#42e565";
  context.lineCap = "round";
  context.lineJoin = "round";

  // draw a line
  context.beginPath();
  // move to the context point
  context.moveTo(100, 100);
  // draw line from start point to end point
  context.lineTo(600, 500);
  context.lineTo(700, 200);
  // render line
  context.stroke();
});

function resizeCanvas() {
  var canvas = document.getElementById("canvas");
  var parent = canvas.parentNode.getBoundingClientRect();

  canvas.width = parent.width;
  canvas.height = parent.height;
}

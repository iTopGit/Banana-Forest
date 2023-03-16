const body = document.querySelector("body");

var res = 9 / 16;
var canvasContainer = document.getElementById("canvas-container");
const canvas = document.getElementById("draw_screen");
canvas.width = canvasContainer.offsetWidth * 0.9;
canvas.height = canvas.width * res;

var toolType = "pencil";
var theColor = "";
var lineW = 5;
let points = [];
let brushRadius = 5;
let prevX = null;
let prevY = null;
let draw = false;
let undoList = [];
let redoList = [];

canvas.style.backgroundColor = "white";
const ctx = canvas.getContext("2d");
ctx.lineWidth = lineW;
ctx.lineCap = "round";
ctx.fillStyle = "#ffffff";
// canvas.style.backgroundColor = "#FFFFFF";

var theInput = document.getElementById("favcolor");
let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

theInput.addEventListener(
  "input",
  function () {
    theColor = theInput.value;
    console.log("the color" + theColor);
    // ctx.fillStyle = theColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // body.style.backgroundColor = theColor;
  },
  false
);

function changestate(state) {
  toolType = state;
  console.log(state);
}

document.getElementById("ageInputId").oninput = function () {
  draw = null;
  lineW = document.getElementById("ageInputId").value;
  document.getElementById("ageOutputId").innerHTML = lineW;
  ctx.lineWidth = lineW;
};

let clrs = document.querySelectorAll(".clr");
clrs = Array.from(clrs);
clrs.forEach((clr) => {
  clr.addEventListener("click", () => {
    ctx.strokeStyle = clr.dataset.clr;
  });
});

let clearBtn = document.querySelector(".clear");
clearBtn.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

let saveBtn = document.querySelector(".save");
saveBtn.addEventListener("click", () => {
  let data = canvas.toDataURL("imag/png");
  let a = document.createElement("a");
  a.href = data;
  a.download = "sketch.png";
  a.click();
});

let doneBtn = document.querySelector(".done");
doneBtn.addEventListener("click", () => {
  let dataUrl = canvas.toDataURL("image/png");
  let img = document.getElementById("img");
  let input_data = document.getElementById("img-input");

  img.src = dataUrl;
  input_data.setAttribute("value", dataUrl);
});

canvas.addEventListener("mousedown", (e) => {
  saveState();
  draw = true;
  let rect = canvas.getBoundingClientRect();
  let scaleX = canvas.width / rect.width;
  let scaleY = canvas.height / rect.height;
  switch (toolType) {
    case "easer":
      ctx.strokeStyle = "#ffffff";
      break;
    case "highlight":
      //do nothing
      ctx.globalAlpha = 0.5;
      break;
    default:
      ctx.globalAlpha = 0.5;
      prevX = (e.clientX - rect.left) * scaleX;
      prevY = (e.clientY - rect.top) * scaleY; // Convert the Y coordinate to canvas coordinate
  }
});

canvas.addEventListener("mouseup", (e) => {
  prevX = null;
  prevY = null;
  draw = false;
});

canvas.addEventListener("mousemove", (e) => {
  let rect = canvas.getBoundingClientRect();
  let scaleX = canvas.width / rect.width;
  let scaleY = canvas.height / rect.height;
  let currentX = (e.clientX - rect.left) * scaleX;
  let currentY = (e.clientY - rect.top) * scaleY;
  switch (toolType) {
    case "easer":
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#ffffff";
      break;
    case "highlight":
      //do nothing
      ctx.globalAlpha = 0.5;
    default:
      ctx.globalAlpha = 1;
  }
  if (prevX == null || prevY == null || !draw) {
    return;
  }

  // Add the current point to the path
  ctx.beginPath();
  ctx.moveTo(prevX, prevY);
  ctx.lineTo(currentX, currentY);
  ctx.stroke();

  // Smooth the path
  let midX = (prevX + currentX) / 2;
  let midY = (prevY + currentY) / 2;
  ctx.quadraticCurveTo(prevX, prevY, midX, midY);

  prevX = currentX;
  prevY = currentY;
});

// Model function
// Get the modal
var modal = document.getElementById("myModal");

// Get the button that opens the modal
var btn = document.getElementById("done");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks the button, open the modal
btn.onclick = function () {
  let data = canvas.toDataURL("imag/png");
  let img = document.getElementById("img");
  img.src = data;
  modal.style.display = "block";
};

// When the user clicks on <span> (x), close the modal
// span.onclick = function () {
//   modal.style.display = "none";
// };

// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
};

let undoStack = [];
let redoStack = [];

document.addEventListener("keydown", (e) => {
  // Check for Ctrl+Z (Undo)
  if (e.ctrlKey && e.key === "z") {
    undo();
  }
  // Check for Ctrl+Y (Redo)
  else if (e.ctrlKey && e.key === "y") {
    redo();
  }
});

function undo() {
  if (undoList.length > 0) {
    redoList.push(canvas.toDataURL());
    let undoImage = new Image();
    undoImage.src = undoList.pop();
    undoImage.onload = function () {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        undoImage,
        0,
        0,
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
    };
  }
}

function redo() {
  if (redoList.length > 0) {
    undoList.push(canvas.toDataURL());
    let redoImage = new Image();
    redoImage.src = redoList.pop();
    redoImage.onload = function () {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        redoImage,
        0,
        0,
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
    };
  }
}

function saveState() {
  undoList.push(canvas.toDataURL());
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function redrawCanvas(state) {
  ctx.putImageData(state, 0, 0);
}

let linePoints = [];

function drawSmoothLine() {
  if (points.length < 3) {
    return;
  }

  let curveSegments = [];

  for (let i = 1; i < points.length - 1; i++) {
    let x0 = points[i - 1].x;
    let y0 = points[i - 1].y;
    let x1 = points[i].x;
    let y1 = points[i].y;
    let x2 = points[i + 1].x;
    let y2 = points[i + 1].y;

    let xc1 = (x0 + x1) / 2;
    let yc1 = (y0 + y1) / 2;
    let xc2 = (x1 + x2) / 2;
    let yc2 = (y1 + y2) / 2;

    let len1 = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
    let len2 = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));

    let k = len1 / (len1 + len2);

    let xm = xc1 + (xc2 - xc1) * k;
    let ym = yc1 + (yc2 - yc1) * k;

    curveSegments.push({
      x0: x1,
      y0: y1,
      x1: xm,
      y1: ym,
      x2: x2,
      y2: y2,
    });
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 0; i < curveSegments.length; i++) {
    let seg = curveSegments[i];
    ctx.quadraticCurveTo(seg.x1, seg.y1, seg.x2, seg.y2);
  }

  ctx.stroke();
}

function addPoint(x, y, dragging) {
  points.push({ x: x, y: y, dragging: dragging });
}

function onMouseDown(e) {
  linePoints = [];
  addPoint(e.clientX, e.clientY);
  canvas.addEventListener("mousemove", onMouseMove);
}

function onMouseMove(e) {
  addPoint(e.clientX, e.clientY);
}

function onMouseUp() {
  if (draw) {
    draw = false;
    saveState();
  }
  prevX = null;
  prevY = null;
}

function getControlPoints(p0, p1, p2, t) {
  let d01 = Math.sqrt(Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2));
  let d12 = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  let fa = (t * d01) / (d01 + d12);
  let fb = t - fa;
  let p1x = p1.x + fa * (p0.x - p2.x);
  let p1y = p1.y + fa * (p0.y - p2.y);
  let p2x = p1.x - fb * (p0.x - p2.x);
  let p2y = p1.y - fb * (p0.y - p2.y);
  return [
    { x: p1x, y: p1y },
    { x: p2x, y: p2y },
  ];
}

function smoothCurveBetween(p1, p2) {
  let controlPoints = getControlPoints(
    points[p1],
    points[p1 + 1],
    points[p2],
    0.6
  );
  let p1x = points[p1].x;
  let p1y = points[p1].y;
  let p2x = points[p1 + 1].x;
  let p2y = points[p1 + 1].y;
  let cp1x = controlPoints[0].x;
  let cp1y = controlPoints[0].y;
  let cp2x = controlPoints[1].x;
  let cp2y = controlPoints[1].y;
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2x, p2y);
}

function smoothDraw() {
  if (!draw) {
    return;
  }

  drawSmoothLine();

  requestAnimationFrame(smoothDraw);
}

//helper
function matchStartColor(pixelPos) {
  let r = colorLayer.data[pixelPos];
  let g = colorLayer.data[pixelPos + 1];
  let b = colorLayer.data[pixelPos + 2];
  return r === startR && g === startG && b === startB;
}

function getPixelColor(x, y) {
  let pixel = imageData.data;
  return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
}

function getCurrentColor() {
  // Get the value of the color input element
  let colorInput = document.getElementById("color-picker");
  let color = colorInput.value;

  return color;
}

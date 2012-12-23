// Amplifier.js
// Copyright Rui Lopes (ruidlopes@gmail.com) 2012-2013


/**
 * Create a namespace under the window scope.
 * @param {string} ns The namespace to be created.
 */
var namespace = function(ns) {
  for (var scope = window, names = ns.split('.'), name;
       name = names.shift();
       scope = scope[name]) {
    scope[name] = scope[name] || {};
  }
}


// Amplifier namespaces.
namespace('amplifier.audio');
namespace('amplifier.audio.input');
namespace('amplifier.audio.volume');
namespace('amplifier.core');
namespace('amplifier.ui');
namespace('amplifier.ui.constants');
namespace('amplifier.ui.Knob');
namespace('amplifier.ui.Switch');


/**
 * Initializes Amplifier.
 */
amplifier.core.init = function() {
  amplifier.audio.init();
  amplifier.ui.init();
};


/**
 * Disposes Amplifier.
 */
amplifier.core.dispose = function() {
};


/**
 * The WebAudio context.
 * @type {AudioContext}
 */
amplifier.audio.context;


/**
 * The audio nodes that will be chained up all the way to the context destination.
 * @type {!Array.<AudioNode>}
 */
amplifier.audio.nodes = [];


/**
 * Initializes audio.
 */
amplifier.audio.init = function() {
  amplifier.audio.context = new window.webkitAudioContext();
  amplifier.audio.initNodes();
};


/**
 * Initializes all audio nodes.
 */
amplifier.audio.initNodes = function() {
  amplifier.audio.volume.init();
  amplifier.audio.nodes.push(amplifier.audio.volume.node);

  var lastNode = amplifier.audio.nodes[amplifier.audio.nodes.length - 1];
  lastNode.connect(amplifier.audio.context.destination);
};


amplifier.audio.powerOn = function() {
  amplifier.audio.input.connect();
};

amplifier.audio.powerOff = function() {
  amplifier.audio.input.disconnect();
};

amplifier.audio.standbyOn = function() {
  amplifier.audio.volume.turnOff();
};

amplifier.audio.standbyOff = function() {
  amplifier.audio.volume.turnOn();
};


/**
 * Returns the destination node to connect the audio input.
 */
amplifier.audio.getDestinationForInput = function() {
  return amplifier.audio.nodes[0];
};


/**
 * The input stream source.
 */
amplifier.audio.input.streamSource;


/**
 */
amplifier.audio.input.connect = function(errorCallback) {
  if (!amplifier.audio.input.streamSource) {
    navigator.webkitGetUserMedia(
        {audio: true, video: false}, amplifier.audio.input.successCallback, errorCallback);
  } else {
    amplifier.audio.input.streamSource.connect(amplifier.audio.getDestinationForInput());
  }
};


/**
 */
amplifier.audio.input.successCallback = function(stream) {
  amplifier.audio.input.streamSource = amplifier.audio.context.createMediaStreamSource(stream);
  amplifier.audio.input.streamSource.connect(amplifier.audio.getDestinationForInput());
};


/**
 */
amplifier.audio.input.disconnect = function() {
  amplifier.audio.input.streamSource.disconnect();
};


amplifier.audio.volume.node = null;

amplifier.audio.volume.on = false;
amplifier.audio.volume.value = 0.7;


/**
 * Initializes a volume node.
 */
amplifier.audio.volume.init = function() {
  amplifier.audio.volume.node  = amplifier.audio.context.createGainNode();
  amplifier.audio.volume.turnOff();
};


/**
 */
amplifier.audio.volume.turnOn = function() {
  amplifier.audio.volume.node.gain.value = amplifier.audio.volume.value;
  amplifier.audio.volume.on = true;
};


/**
 *
 */
amplifier.audio.volume.turnOff = function() {
  amplifier.audio.volume.node.gain.value = 0.0;
  amplifier.audio.volume.on = false;
};


amplifier.audio.volume.setValue = function(value) {
  amplifier.audio.volume.value = value;
  if (amplifier.audio.volume.on) {
    amplifier.audio.volume.node.gain.value = value;
  }
};


amplifier.audio.volume.getValue = function() {
  return amplifier.audio.volume.value;
};


/**
 * The UI canvas element.
 * @type {HTMLCanvasElement}
 */
amplifier.ui.canvas;


/**
 * The UI canvas context.
 * @type {CanvasRenderingContext2D}
 */
amplifier.ui.context;


/**
 * Initializes the UI.
 */
amplifier.ui.init = function() {
  amplifier.ui.canvas = document.getElementById('amplifier-canvas');
  amplifier.ui.context = amplifier.ui.canvas.getContext('2d');
  amplifier.ui.reflow();
};


/**
 * Reflows the canvas.
 */
amplifier.ui.reflow = function() {
  amplifier.ui.canvas.width = document.width;
  amplifier.ui.canvas.height = document.height;
  amplifier.ui.redraw();
};


/**
 * Redraws the UI.
 */
amplifier.ui.redraw = function() {
  amplifier.ui.redrawBorder();
  amplifier.ui.redrawGrid();
  amplifier.ui.redrawPlate();
  amplifier.ui.redrawSwitches();
  amplifier.ui.redrawKnobs();
};

amplifier.ui.drawRoundedRect = function(x, y, w, h, radius, strokeStyle, lineWidth) {
  var ctx = amplifier.ui.context;
  ctx.strokeStyle = strokeStyle || '#ffffff';
  ctx.lineWidth = lineWidth || 1.0;

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y,     x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x,     y + h, radius);
  ctx.arcTo(x,     y + h, x,     y,     radius);
  ctx.arcTo(x,     y,     x + w, y,     radius);
  ctx.closePath();
  ctx.stroke();
};

amplifier.ui.constants.borderSize = 50;
amplifier.ui.constants.radius = 50;
amplifier.ui.constants.controlsHeight = 250;


amplifier.ui.redrawBorder = function() {
  var x = amplifier.ui.constants.borderSize;
  var y = amplifier.ui.constants.borderSize;
  var w = amplifier.ui.canvas.width - (amplifier.ui.constants.borderSize * 2);
  var h = amplifier.ui.canvas.height - (amplifier.ui.constants.borderSize * 2);
  amplifier.ui.drawRoundedRect(x, y, w, h, amplifier.ui.constants.radius, '#151515', 20);
  amplifier.ui.drawRoundedRect(x, y, w, h, amplifier.ui.constants.radius, '#333', 1);
};


amplifier.ui.gridPattern = (function() {
  var patternCanvas = document.createElement('canvas');
  patternCanvas.width = 100;
  patternCanvas.height = 100;
  var ctx = patternCanvas.getContext('2d');
  var cross = function(strokeStyle, lineWidth) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(100, 100);
    ctx.moveTo(100, 0);
    ctx.lineTo(0, 100);
    ctx.closePath();
    ctx.stroke();
  };

  cross('#151515', 15.0);
  cross('#1c1c1c', 7.0);
  cross('#2a2a2a', 3.0);
  cross('#333333', 1.0);

  return patternCanvas;
})();

amplifier.ui.drawValve = function(x, y, w, h, warmth) {
};

amplifier.ui.redrawGrid = function() {
  var ctx = amplifier.ui.context;
  var x = amplifier.ui.constants.borderSize + amplifier.ui.constants.radius;
  var y = amplifier.ui.constants.borderSize + amplifier.ui.constants.radius;
  var w = amplifier.ui.canvas.width - (x * 2);
  var h = amplifier.ui.canvas.height - (y * 2) - amplifier.ui.constants.controlsHeight;

  // background
  ctx.fillStyle= '#000';
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.closePath();
  ctx.fill();

  // valves
  amplifier.ui.drawValve(x + 20, y + h, 100, 200, 1.0);
  amplifier.ui.drawValve(x + 20, y + h, 100, 200, 1.0);

  // grid
  var pattern = ctx.createPattern(amplifier.ui.gridPattern, 'repeat');
  ctx.fillStyle = pattern;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.closePath();
  ctx.fill();

  // border
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.closePath();
  ctx.stroke();
};


amplifier.ui.redrawPlate = function() {
};


amplifier.ui.redrawSwitches = function() {
  var ctx = amplifier.ui.context;
};


amplifier.ui.redrawKnobs = function() {
  var ctx = amplifier.ui.context;
};


// Bind all global events, kicking core initialization on window load.
window.addEventListener('load', amplifier.core.init);
window.addEventListener('unload', amplifier.core.dispose);
window.addEventListener('resize', amplifier.ui.reflow);

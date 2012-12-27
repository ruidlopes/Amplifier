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
namespace('amplifier.ui.chalk');
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
  amplifier.ui.chalk.init();
  amplifier.ui.reflow();
};


/**
 * Reflows the canvas.
 */
amplifier.ui.reflow = function() {
  amplifier.ui.canvas.width = document.width;
  amplifier.ui.canvas.height = document.height;
  amplifier.ui.context.fillStyle = '#181818';
  amplifier.ui.context.fillRect(0, 0, amplifier.ui.canvas.width, amplifier.ui.canvas.height);
  amplifier.ui.redraw();
};


/**
 * Redraws the UI.
 */
amplifier.ui.redraw = function() {
  amplifier.ui.redrawBorder();
  amplifier.ui.redrawGrid();
  amplifier.ui.redrawLogo();
  amplifier.ui.redrawSwitches();
  amplifier.ui.redrawKnobs();
};

amplifier.ui.constants.borderSize = 50;
amplifier.ui.constants.radius = 50;
amplifier.ui.constants.controlsHeight = 250;


amplifier.ui.redrawBorder = function() {
  var r = amplifier.ui.constants.radius;
  var x = amplifier.ui.constants.borderSize;
  var y = amplifier.ui.constants.borderSize;
  var w = amplifier.ui.canvas.width - (amplifier.ui.constants.borderSize * 2);
  var h = amplifier.ui.canvas.height - (amplifier.ui.constants.borderSize * 2);
  amplifier.ui.chalk.roundRect(x, y, w, h, r);

  amplifier.ui.chalk.circleWithCenter(x + r, y + r, r, 1);
  amplifier.ui.chalk.circleWithCenter(x + w - r, y + r, r, 1);
  amplifier.ui.chalk.circleWithCenter(x + r, y + h - r, r, 1);
  amplifier.ui.chalk.circleWithCenter(x + w - r, y + h - r, r, 1);

  amplifier.ui.chalk.rectWithBleed(x, y, w, h, 1, 15);
};

amplifier.ui.redrawGrid = function() {
  var ctx = amplifier.ui.context;
  var x = amplifier.ui.constants.borderSize + amplifier.ui.constants.radius;
  var y = amplifier.ui.constants.borderSize + amplifier.ui.constants.radius;
  var w = amplifier.ui.canvas.width - (x * 2);
  var h = amplifier.ui.canvas.height - (y * 2) - amplifier.ui.constants.controlsHeight;

  amplifier.ui.chalk.rect(x, y, w, h);
  amplifier.ui.chalk.rectWithBleed(x, y, w, h, 1, 15);
};

amplifier.ui.redrawLogo = function() {
  var logoX = amplifier.ui.constants.borderSize * 2 - 20;
  var logoY = amplifier.ui.canvas.height - amplifier.ui.constants.controlsHeight - 25;
  amplifier.ui.chalk.text('Amplifier', logoX, logoY, 'italic 50pt serif');
  amplifier.ui.chalk.text('by Rui Lopes', logoX + 260, logoY, 'italic 13pt serif');
  var x = amplifier.ui.constants.borderSize - 15;
  var w = amplifier.ui.canvas.width - x;
  amplifier.ui.chalk.line(x, logoY, w, logoY, 1);
};

amplifier.ui.redrawGenericKnob = function(x, y, angle) {
  amplifier.ui.chalk.circle(x, y, 50);
  amplifier.ui.chalk.lineAngle(x, y, 70, angle);
};

amplifier.ui.redrawSwitch = function(x, y, labels, state) {
  amplifier.ui.redrawGenericKnob(x, y, (state ? -1 : 1) * Math.PI / 2);
  amplifier.ui.chalk.text(labels[0], x, y + 80, '12pt sans-serif', 'center', 'middle');
  amplifier.ui.chalk.text(labels[1], x, y - 80, '12pt sans-serif', 'center', 'middle');
};

amplifier.ui.redrawSwitches = function() {
  var switchX = amplifier.ui.constants.borderSize * 2 + 50;
  var switchY = amplifier.ui.canvas.height - amplifier.ui.constants.controlsHeight + 100;
  var switchDelta = 150;
  amplifier.ui.redrawSwitch(switchX, switchY, ['POWER', 'ON'], true);
  amplifier.ui.redrawSwitch(switchX + switchDelta, switchY, ['STANDBY', 'ON'], false);

  var x = amplifier.ui.constants.borderSize - 15;
  var w = amplifier.ui.canvas.width - x;
  amplifier.ui.chalk.line(x, switchY, w, switchY, 1);
};

amplifier.ui.redrawKnob = function(x, y, label, value) {
  value = value > 1 ? 1 : value < 0 ? 0 : value;
  var angle = Math.PI * 0.75 + value * Math.PI * 1.5;
  amplifier.ui.redrawGenericKnob(x, y, angle);
  amplifier.ui.chalk.text(label, x, y + 80, '12pt sans-serif', 'center', 'middle');

  for (var valueLabel = 1; valueLabel < 12; ++valueLabel) {
    var currentLabel = valueLabel.toString();
    var currentAngle = Math.PI * 0.75 + (valueLabel - 1) * Math.PI * 0.15;
    var distance = 65;
    var currentLabelX = x + Math.cos(currentAngle) * distance;
    var currentLabelY = y + Math.sin(currentAngle) * distance;
    amplifier.ui.chalk.text(
        currentLabel, currentLabelX, currentLabelY, '10pt sans-serif', 'center', 'middle');
  }
};

amplifier.ui.redrawKnobs = function() {
  var knobX = amplifier.ui.canvas.width - amplifier.ui.constants.borderSize * 2 - 50;
  var knobY = amplifier.ui.canvas.height - amplifier.ui.constants.controlsHeight + 100;
  var knobDelta = 150;
  amplifier.ui.redrawKnob(knobX - knobDelta * 5, knobY, 'VOLUME', 0);
  amplifier.ui.redrawKnob(knobX - knobDelta * 4, knobY, 'DISTORTION', 1.0);
  amplifier.ui.redrawKnob(knobX - knobDelta * 3, knobY, 'BASS', 0.5);
  amplifier.ui.redrawKnob(knobX - knobDelta * 2, knobY, 'MIDDLE', 0.6);
  amplifier.ui.redrawKnob(knobX - knobDelta, knobY, 'TREBLE', 0.8);
  amplifier.ui.redrawKnob(knobX, knobY, 'REVERB', 0.4);
};


amplifier.ui.chalk.lineWidth = 10;

amplifier.ui.chalk.pattern;

amplifier.ui.chalk.createPattern = function() {
  var patternSize = 512;
  var canvas = document.createElement('canvas');
  canvas.width = patternSize;
  canvas.height = patternSize;

  var context = canvas.getContext('2d');
  context.fillStyle = '#ccc';
  context.fillRect(0, 0, patternSize, patternSize);

  var imageData = context.getImageData(0, 0, patternSize, patternSize);
  var cycles = 4 * patternSize * patternSize;
  for (var pixel = 0; pixel < cycles; ++pixel) {
    var rx = Math.floor(Math.random() * patternSize);
    var ry = Math.floor(Math.random() * patternSize);
    var ra = Math.floor(Math.random() * 256);
    var delta = ((ry * patternSize) + rx) * 4;
    imageData.data[delta + 3] = ra;
  }
  context.putImageData(imageData, 0, 0);

  return amplifier.ui.context.createPattern(canvas, 'repeat');
};

amplifier.ui.chalk.init = function() {
  amplifier.ui.chalk.pattern = amplifier.ui.chalk.createPattern();
};

amplifier.ui.chalk.shape = function(shapeFunction, lineWidth) {
  var ctx = amplifier.ui.context;
  ctx.save();
  ctx.fillStyle = amplifier.ui.chalk.pattern;
  shapeFunction(lineWidth || amplifier.ui.chalk.lineWidth);
  ctx.fill();
  ctx.restore();
};

amplifier.ui.chalk.text = function(text, x1, y1, font, align, baseline) {
  var ctx = amplifier.ui.context;
  amplifier.ui.chalk.shape(function() {
    ctx.font = font || '10px sans-serif';
    ctx.textAlign = align || 'start';
    ctx.textBaseline = baseline || 'alphabetic';
    ctx.fillText(text, x1, y1);
  });
};

amplifier.ui.chalk.arc = function(xc, yc, r, ia, ea, lineWidth) {
  var ctx = amplifier.ui.context;
  amplifier.ui.chalk.shape(function(lineWidth) {
    ctx.beginPath();
    ctx.arc(xc, yc, r + lineWidth/2, ia, ea, true);
    ctx.arc(xc, yc, r - lineWidth/2, ea, ia, false);
    ctx.closePath();
  }, lineWidth);
};

amplifier.ui.chalk.circle = function(xc, yc, r, lineWidth) {
  amplifier.ui.chalk.arc(xc, yc, r, 0, Math.PI * 2, lineWidth);
};

amplifier.ui.chalk.circleWithCenter = function(xc, yc, r, lineWidth) {
  amplifier.ui.chalk.circle(xc, yc, r, lineWidth);
  amplifier.ui.chalk.line(xc - 5, yc, xc + 5, yc, 1);
  amplifier.ui.chalk.line(xc, yc - 5, xc, yc + 5, 1);
};

amplifier.ui.chalk.lineAngle = function(x1, y1, size, angle, lineWidth) {
  var ctx = amplifier.ui.context;
  amplifier.ui.chalk.shape(function(lineWidth) {
    var lw2 = lineWidth * 0.5;
    ctx.translate(x1, y1);
    ctx.rotate(angle);
    ctx.translate(-lw2, -lw2);
    ctx.beginPath();
    ctx.rect(0, 0, size, lineWidth);
    ctx.closePath();
  }, lineWidth);
};

amplifier.ui.chalk.line = function(x1, y1, x2, y2, lineWidth) {
  lineWidth = lineWidth || amplifier.ui.chalk.lineWidth;
  var xx = x2 - x1;
  var yy = y2 - y1;
  var size = Math.sqrt(xx * xx + yy * yy) + lineWidth;
  var angle = Math.atan2(yy, xx);
  amplifier.ui.chalk.lineAngle(x1, y1, size, angle, lineWidth);
};

amplifier.ui.chalk.rectWithBleed = function(x1, y1, w, h, lineWidth, bleed) {
  var x2 = x1 + w;
  var y2 = y1 + h;
  amplifier.ui.chalk.line(x1 - bleed, y1, x2 + bleed, y1, lineWidth);
  amplifier.ui.chalk.line(x1, y1 - bleed, x1, y2 + bleed, lineWidth);
  amplifier.ui.chalk.line(x2, y1 - bleed, x2, y2 + bleed, lineWidth);
  amplifier.ui.chalk.line(x1 - bleed, y2, x2 + bleed, y2, lineWidth);
};

amplifier.ui.chalk.rect = function(x1, y1, w, h, lineWidth) {
  amplifier.ui.chalk.rectWithBleed(x1, y1, w, h, lineWidth, 0);
};

amplifier.ui.chalk.roundRect = function(x1, y1, w, h, r, lineWidth) {
  lineWidth = lineWidth || amplifier.ui.chalk.lineWidth;
  var x2 = x1 + w;
  var y2 = y1 + h;
  amplifier.ui.chalk.arc(x1 + r, y1 + r, r, -Math.PI / 2, Math.PI, lineWidth);
  amplifier.ui.chalk.line(x1 + r, y1, x2 - r, y1, lineWidth);
  amplifier.ui.chalk.arc(x2 - r, y1 + r, r, 0, -Math.PI / 2, lineWidth);
  amplifier.ui.chalk.line(x1, y1 + r, x1, y2 - r, lineWidth);
  amplifier.ui.chalk.line(x2, y1 + r, x2, y2 - r, lineWidth);
  amplifier.ui.chalk.arc(x1 + r, y2 - r, r, Math.PI, Math.PI / 2, lineWidth);
  amplifier.ui.chalk.line(x1 + r, y2, x2 - r, y2, lineWidth);
  amplifier.ui.chalk.arc(x2 - r, y2 - r, r, Math.PI / 2, 0, lineWidth);
};

// Bind all global events, kicking core initialization on window load.
window.addEventListener('load', amplifier.core.init);
window.addEventListener('unload', amplifier.core.dispose);
window.addEventListener('resize', amplifier.ui.reflow);

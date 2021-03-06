// Amplifier.js
// Copyright Rui Lopes (ruidlopes@gmail.com) 2012-2013.


/**
 * Creates a namespace under the window scope.
 * @param {string} ns The namespace to be created.
 */
var namespace = function(ns) {
  for (var scope = window, names = ns.split('.'), name;
       name = names.shift();
       scope = scope[name]) {
    scope[name] = scope[name] || {};
  }
}


/**
 * Establishes oop-style inheritance.
 * @param {Function} base The base object.
 * @return {Function} The inherited object.
 */
Function.prototype.inherits = function(base) {
  var empty = function() {};
  empty.prototype = base.prototype;
  this.prototype = new empty();
  return this;
};



// Micro inter-object messaging.
namespace('lib.msg');

lib.msg.listeners_ = {};
lib.msg.listen = function(msg, callback) {
  lib.msg.listeners_[msg] = lib.msg.listeners_[msg] || [];
  lib.msg.listeners_[msg].push(callback);
};
lib.msg.send = function(msg) {
  var args = Array.prototype.slice.call(arguments, 1);
  var listeners = lib.msg.listeners_[msg];
  for (var i in listeners) {
    if (listeners[i].apply(this, args) === false) {
      return;
    }
  }
};



// Reusable generic functions.
namespace('lib.functions');

lib.functions.constant = function(value) { return function() { return value; }; };
lib.functions.EMPTY = lib.functions.constant();
lib.functions.NULL = lib.functions.constant(null);
lib.functions.TRUE = lib.functions.constant(true);
lib.functions.FALSE = lib.functions.constant(false);



// Micro math library.
namespace('lib.math');

lib.math.clamp = function(value, min, max) {
  return Math.max(Math.min(value, max), min);
};

lib.math.map = function(value, initialInterval, finalInterval) {
  return (finalInterval[1] - finalInterval[0]) *
    value / (initialInterval[1] - initialInterval[0]);
};



// Amplifier namespaces.
namespace('amplifier.audio');
namespace('amplifier.audio.BandStop');
namespace('amplifier.audio.Biquad');
namespace('amplifier.audio.Compressor');
namespace('amplifier.audio.Distortion');
namespace('amplifier.audio.HighPass');
namespace('amplifier.audio.LowPass');
namespace('amplifier.audio.Node');
namespace('amplifier.audio.Reverb');
namespace('amplifier.audio.Volume');
namespace('amplifier.audio.input');
namespace('amplifier.config');
namespace('amplifier.config.Config');
namespace('amplifier.core');
namespace('amplifier.ui');
namespace('amplifier.ui.Knob');
namespace('amplifier.ui.Switch');
namespace('amplifier.ui.chalk');
namespace('amplifier.ui.constants');
namespace('amplifier.ui.events');


/**
 * Initializes Amplifier.
 */
amplifier.core.init = function() {
  amplifier.audio.init();
  amplifier.ui.init();
  amplifier.config.init();
};


/**
 * Disposes Amplifier.
 */
amplifier.core.dispose = function() {
};


/**
 * Handles an error.
 * @param {string} message The error message.
 */
amplifier.core.error = function(message) {
  // For now, just throw it.
  // TODO(ruidlopes): Display a message in the UI.
  throw Error(message);
};


/**
 * The WebAudio context.
 * @type {AudioContext}
 */
amplifier.audio.context;


/**
 * The compressor node.  This node is not controllable by the user.  Its sole purpose is to act as
 * noise reduction.
 */
amplifier.audio.compressor = null;


/**
 * The volume node.
 * @type {amplifier.audio.Volume}
 */
amplifier.audio.volume = null;


/**
 * The bass node.
 * @type {amplifier.audio.HighPass}
 */
amplifier.audio.bass = null;


/**
 * The middle node.
 * @type {amplifier.audio.BandStop}
 */
amplifier.audio.middle = null;


/**
 * The treble node.
 * @type {amplifer.audio.LowPass}
 */
amplifier.audio.treble = null;


/**
 * The distortion node.
 * @type {amplifier.audio.Distortion}
 */
amplifier.audio.distortion = null;


/**
 * The reverb node.
 * @type {amplifier.audio.Reverb}
 */
amplifier.audio.reverb = null;


/**
 * Initializes audio.
 */
amplifier.audio.init = function() {
  var audioContext = window.webkitAudioContext || window.mozAudioContext;
  if (audioContext) {
    amplifier.audio.context = new audioContext();
  } else {
    amplifier.core.error('WebAudio API not implemented. Please use a modern browser.');
  }
  amplifier.audio.initNodes();
  amplifier.audio.bindListeners();
};


amplifier.audio.chainNodes = function() {
  var nodes = arguments;
  for (var i = 0; i < nodes.length - 1; i++) {
    nodes[i].getOutput().connect(nodes[i + 1].getInput());
  }
};

/**
 * Initializes all audio nodes.
 */
amplifier.audio.initNodes = function() {
  amplifier.audio.compressor1 = new amplifier.audio.Compressor();
  amplifier.audio.compressor2 = new amplifier.audio.Compressor();
  amplifier.audio.distortion = new amplifier.audio.Distortion();
  amplifier.audio.volume = new amplifier.audio.Volume();
  amplifier.audio.bass = new amplifier.audio.HighPass();
  amplifier.audio.middle = new amplifier.audio.BandStop();
  amplifier.audio.treble = new amplifier.audio.LowPass();
  amplifier.audio.reverb = new amplifier.audio.Reverb();

  amplifier.audio.chainNodes(
      amplifier.audio.compressor1,
      amplifier.audio.distortion,
      amplifier.audio.volume,
      amplifier.audio.bass,
      amplifier.audio.middle,
      amplifier.audio.treble,
      amplifier.audio.compressor2
  );

  amplifier.audio.compressor2.getOutput().connect(
      amplifier.audio.context.destination);

  // The reverb works in parallel.
  amplifier.audio.reverb.connect(
      amplifier.audio.compressor2.getOutput(),
      amplifier.audio.context.destination);
};


/**
 */
amplifier.audio.getFirstNode = function() {
  return amplifier.audio.compressor1.getInput();
};

/**
 * Binds message listeners.
 */
amplifier.audio.bindListeners = function() {
  var switchListeners = {
    'POWER': amplifier.audio.power,
    'SOUND': amplifier.audio.sound
  };
  lib.msg.listen('SWITCH_STATE', function(id, state) {
    if (switchListeners[id]) {
      switchListeners[id](state);
    }
  });

  var bindSetValue = function(node) {
    return node.setValue.bind(node);
  };

  var knobListeners = {
    'VOLUME': bindSetValue(amplifier.audio.volume),
    'DISTORTION': bindSetValue(amplifier.audio.distortion),
    'BASS': bindSetValue(amplifier.audio.bass),
    'MIDDLE': bindSetValue(amplifier.audio.middle),
    'TREBLE': bindSetValue(amplifier.audio.treble),
    'REVERB': bindSetValue(amplifier.audio.reverb)
  };
  lib.msg.listen('KNOB_VALUE', function(id, value) {
    if (knobListeners[id]) {
      knobListeners[id](value);
    }
  });
};


/**
 * Turns on/off the amplifier power.  It requests for an input source if nothing connected yet.
 * @param {boolean} state The desired amplifier power state.
 */
amplifier.audio.power = function(state) {
  if (state) {
    amplifier.audio.input.connect();
  } else {
    amplifier.audio.input.disconnect();
  }
};


/**
 * Turns on/off the amplifier sound.
 * @param {boolean} state The desired amplifier sound state.
 */
amplifier.audio.sound = function(state) {
  if (state) {
    amplifier.audio.volume.turnOn();
  } else {
    amplifier.audio.volume.turnOff();
  }
};


/**
 * The input stream source.
 */
amplifier.audio.input.streamSource = null;


/**
 * Tries connecting the audio input.
 */
amplifier.audio.input.connect = function() {
  if (!amplifier.audio.input.streamSource) {
    navigator.webkitGetUserMedia(
        {audio: true, video: false},
        amplifier.audio.input.successCallback,
        amplifier.audio.input.errorCallback);
  } else {
    amplifier.audio.input.streamSource.connect(amplifier.audio.getFirstNode());
  }
};


/**
 * Creates the media stream source for the audio input.
 */
amplifier.audio.input.successCallback = function(stream) {
  amplifier.audio.input.streamSource = amplifier.audio.context.createMediaStreamSource(stream);
  amplifier.audio.input.streamSource.connect(amplifier.audio.getFirstNode());
};


/**
 * Handles audio input connect failure.
 */
amplifier.audio.input.errorCallback = function() {
  lib.msg.send('SWITCH_FAILURE', 'POWER');
  amplifier.core.error('Unauthorized access to microphone');
};


/**
 * Disconnects the audio input.
 */
amplifier.audio.input.disconnect = function() {
  amplifier.audio.input.streamSource.disconnect();
};



/**
 * An audio node.
 * @param {AudioNode} opt_node The underlying WebAudio node.
 * @constructor
 */
amplifier.audio.Node = function(opt_node) {
  /**
   * @type {AudioNode}
   */
  this.node_ = opt_node;

  /**
   * @type {number}
   */
  this.value = 0.0;
};


/**
 * Gets the internal input audio node.
 * @return {AudioNode} The input audio node.
 */
amplifier.audio.Node.prototype.getInput = function() {
  return this.node_;
};


/**
 * Gets the internal output audio node.
 * @return {AudioNode} The output audio node.
 */
amplifier.audio.Node.prototype.getOutput = function() {
  return this.node_;
};


/**
 * Sets the new value for this node.
 * @param {number} newValue The new value.
 */
amplifier.audio.Node.prototype.setValue = function(newValue) {
  this.value = newValue;
};


/**
 * Gets the current value for this node.
 * @return {number} The current value.
 */
amplifier.audio.Node.prototype.getValue = function() {
  return this.value;
};



/**
 * A compressor node.
 * @constructor
 * @extends {amplifier.audio.Node}
 */
amplifier.audio.Compressor = function() {
  amplifier.audio.Node.call(this, amplifier.audio.context.createDynamicsCompressor());
}.inherits(amplifier.audio.Node);



/**
 * A volume node.
 * @constructor
 * @extends {amplifier.audio.Node}
 */
amplifier.audio.Volume = function() {
  amplifier.audio.Node.call(this, amplifier.audio.context.createGain());

  /**
   * @type {boolean}
   */
  this.on = false;

  this.turnOff();
}.inherits(amplifier.audio.Node);


/**
 * The amplification factor to be applied.
 * @type {number}
 * @const
 */
amplifier.audio.Volume.AMPLIFICATION = 10;


/**
 * Turns on the volume.
 */
amplifier.audio.Volume.prototype.turnOn = function() {
  this.on = true;
  this.setValue(this.value);
};


/**
 * Turns off the volume.
 */
amplifier.audio.Volume.prototype.turnOff = function() {
  this.on = false;
  this.setValue(this.value);
};


/** @override */
amplifier.audio.Volume.prototype.setValue = function(newValue) {
  if (this.on) {
    this.node_.gain.value = newValue * amplifier.audio.Volume.AMPLIFICATION;
  } else {
    this.node_.gain.value = 0.0;
  }
  amplifier.audio.Node.prototype.setValue.call(this, newValue);
};



/**
 * A generic biquad filter.
 * @param {string} type The biquad filter type (as per WebAudio API).
 * @constructor
 * @extends {amplifier.audio.Node}
 */
amplifier.audio.Biquad = function(type) {
  amplifier.audio.Node.call(this, amplifier.audio.context.createBiquadFilter());
  this.node_.type = this.node_[type.toUpperCase()];
}.inherits(amplifier.audio.Node);


/** @override */
amplifier.audio.Biquad.prototype.setValue = function(newValue, computedValue) {
  amplifier.audio.Node.prototype.setValue.call(this, newValue);
  this.node_.frequency.value = computedValue;
};



/**
 * A low-pass filter.  This is the audio counterpart for the 'TREBLE' knob.
 * @constructor
 * @extends {amplifier.audio.Biquad}
 */
amplifier.audio.LowPass = function() {
  amplifier.audio.Biquad.call(this, 'lowpass');
}.inherits(amplifier.audio.Biquad);


/** @override */
amplifier.audio.LowPass.prototype.setValue = function(newValue) {
  // 8-string guitars range from F#1 (46Hz) to E6 (1,319Hz).
  // 6-string bass guitars range from B0 (31Hz) to C5 (523Hz).
  // To support both ranges, filters should accommodate [0.0 - 1.0] to [31Hz - 1,319Hz].
  // Since perception of sound is logarithm, we must compensate it with an exponential growth on
  // the node value, so that a knob at 0.5 maps to twice the frequency cut if it were at 1.0.
  var computedValue = lib.math.map(Math.pow(newValue, 2), [0, 1], [650, 1319]);
  amplifier.audio.Biquad.prototype.setValue.call(this, newValue, computedValue);
};



/**
 * A band-stop filter.  This is the audio counterpart for the 'MIDDLE' knob.
 * @constructor
 * @extends {amplifier.audio.Biquad}
 */
amplifier.audio.BandStop = function() {
  amplifier.audio.Biquad.call(this, 'notch');
  this.node_.frequency.value = lib.math.map(0.5, [0, 1], [31, 1319]);
}.inherits(amplifier.audio.Biquad);


/** @override */
amplifier.audio.BandStop.prototype.setValue = function(newValue) {
  // Since perception of sound is logarithm, we must compensate it with an exponential growth on
  // the node value, so that a knob at 0.5 maps to twice the frequency cut if it were at 1.0.
  var computedValue = 10 * Math.pow(0.1 + Math.min(0.9, newValue), 2);
  this.value = newValue;
  this.node_.Q.value = computedValue;
};



/**
 * A high-pass filter.  This is the audio counterpart for the 'BASS' knob.
 * @constructor
 * @extends {amplifier.audio.Biquad}
 */
amplifier.audio.HighPass = function() {
  amplifier.audio.Biquad.call(this, 'highpass');
}.inherits(amplifier.audio.Biquad);


/** @override */
amplifier.audio.HighPass.prototype.setValue = function(newValue) {
  // 8-string guitars range from F#1 (46Hz) to E6 (1,319Hz).
  // 6-string bass guitars range from B0 (31Hz) to C5 (523Hz).
  // To support both ranges, filters should accommodate [0.0 - 1.0] to [31Hz - 1,319Hz].
  // Since perception of sound is logarithm, we must compensate it with an exponential growth on
  // the node value, so that a knob at 0.5 maps to twice the frequency cut if it were at 1.0.
  var computedValue = lib.math.map(Math.pow(1.0 - newValue, 2), [0, 1], [31, 650]);
  amplifier.audio.Biquad.prototype.setValue.call(this, newValue, computedValue);
};



/**
 * Distortion.
 * @constructor
 * @extends {amplifier.audio.Node}
 */
amplifier.audio.Distortion = function() {
  amplifier.audio.Node.call(this, amplifier.audio.context.createWaveShaper());
  this.curve = new Float32Array(amplifier.audio.Distortion.SAMPLES);
  this.node_.curve = this.curve;

  this.distortion = 0.0;
}.inherits(amplifier.audio.Node);


/**
 * Curve sample size.
 * @type {number}
 */
amplifier.audio.Distortion.SAMPLES = 2048;


/**
 * Computes the wave shaper curve.
 * @private
 */
amplifier.audio.Distortion.prototype.computeCurve_ = function() {
  var a = Math.sin(this.distortion * Math.PI * 0.5);
  var k = 2 * a / (1 - a);
  for (var i = 0; i < amplifier.audio.Distortion.SAMPLES; ++i) {
    var x = (i - 0) * (1 - (-1)) / (amplifier.audio.Distortion.SAMPLES - 0) + (-1);
    this.curve[i] = (1 + k) * x / (1 + k * Math.abs(x));
  }
};


/** @override */
amplifier.audio.Distortion.prototype.setValue = function(newValue) {
  var computedValue = lib.math.clamp(newValue, 0.0, 0.985);
  this.distortion = computedValue;
  this.computeCurve_();
  amplifier.audio.Node.prototype.setValue.call(this, newValue);
};



/**
 * @constructor
 */
amplifier.audio.Reverb = function() {
  amplifier.audio.Node.call(this);

  /**
   * @type {!Array.<!Object>}
   * @private
   */
  this.delays_ = amplifier.audio.Reverb.createDelayLine();

  /**
   * @type {!Array.<!Object>}
   * @private
   */
  this.allPasses_ = amplifier.audio.Reverb.createAllPassLine();
}.inherits(amplifier.audio.Node);


/**
 * Creates a gain node.
 * @param {number} level The gain level.
 * @return {!AudioNode} The gain node.
 */
amplifier.audio.Reverb.createGain = function(level) {
  var node = amplifier.audio.context.createGain();
  node.gain.value = level;
  return node;
};


/**
 * Creates a delay node.
 * @param {number} time The delay time.
 * @return {!{input: !AudioNode, output: !AudioNode}} The delay node.
 */
amplifier.audio.Reverb.createDelay = function(time) {
  var node = amplifier.audio.context.createDelay(2.0);  // Buffer a maximum of 2 seconds.
  node.delayTime.value = time;
  var gain = amplifier.audio.Reverb.createGain(1.2 - time);
  node.connect(gain);
  return {
    input: node,
    output: gain
  };
};


/**
 * Creates an allpass filter node.
 * @param {number} frequency The allpass frequency.
 * @retun {!{input: !AudioNode, output: !AudioNode}} The allpass node.
 */
amplifier.audio.Reverb.createAllPass = function(frequency) {
  var node = amplifier.audio.context.createBiquadFilter();
  node.type = node.ALLPASS;
  node.frequency.value = frequency * 5.0;
  node.Q.value = 1000.0;
  var gain = amplifier.audio.Reverb.createGain(1.0);
  node.connect(gain);
  return {
    input: node,
    output: gain
  };
};


/**
 * Creates a reverb delay line.
 * @return {!Array} The delay line.
 */
amplifier.audio.Reverb.createDelayLine = function() {
  return [
    amplifier.audio.Reverb.createDelay(0.0),
    amplifier.audio.Reverb.createDelay(0.116),
    amplifier.audio.Reverb.createDelay(0.188),
    amplifier.audio.Reverb.createDelay(0.277),
    amplifier.audio.Reverb.createDelay(0.356),
    amplifier.audio.Reverb.createDelay(0.422),
    amplifier.audio.Reverb.createDelay(0.491),
    amplifier.audio.Reverb.createDelay(0.557),
    amplifier.audio.Reverb.createDelay(0.617),
    amplifier.audio.Reverb.createDelay(0.800),
    amplifier.audio.Reverb.createDelay(1.100)
  ];
};


/**
 * Creates a reverb allpass line.
 * @return {!Array} The allpass line.
 */
amplifier.audio.Reverb.createAllPassLine = function() {
  return [
    amplifier.audio.Reverb.createAllPass(225),
    amplifier.audio.Reverb.createAllPass(556),
    amplifier.audio.Reverb.createAllPass(441),
    amplifier.audio.Reverb.createAllPass(341)
  ];
};


/**
 * Connects a set of nodes in sequence.
 * @param {!Array} nodes The nodes to be connected.
 * @param {!Object} output The final node to be connected.
 */
amplifier.audio.Reverb.serial = function(nodes, output) {
  for (var i = 0; i < nodes.length - 1; ++i) {
    nodes[i].output.connect(nodes[i + 1].input);
  }
  nodes[nodes.length - 1].output.connect(output);
};


/**
 * Connects a set of nodes in parallel.
 * @param {!Array} nodes The nodes to be connected.
 * @param {!Object} input The initial node to be connected.
 * @param {!Object} output The final node to be connected.
 */
amplifier.audio.Reverb.parallel = function(nodes, input, output) {
  for (var i = 0; i < nodes.length; ++i) {
    input.connect(nodes[i].input);
    nodes[i].output.connect(output);
  }
};


/**
 * Connects all reverb lines between an input and an output, as follows:
 *
 *       / node \
 * input - node - node - node - ... - output
 *       \ .... /
 *
 * @param {!AudioNode} input The input node.
 * @param {!AudioNode} output The output node.
 */
amplifier.audio.Reverb.prototype.connect = function(input, output) {
  amplifier.audio.Reverb.parallel(this.delays_, input, this.allPasses_[0].input);
  amplifier.audio.Reverb.serial(this.allPasses_, output);
};


/** @override */
amplifier.audio.Reverb.prototype.setValue = function(newValue) {
  this.allPasses_[this.allPasses_.length - 1].output.gain.value = newValue;
};


/**
 * window.requestAnimationFrame poly.
 * @type {Function}
 * @private
 */
amplifier.ui.requestAnimationFrame_ =
    window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;


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
 * The UI canvas background color.
 * @type {string}
 */
amplifier.ui.background = '#181818';


/**
 * The UI switches.
 * @type {!Array.<!amplifier.ui.Switch>}
 * @private
 */
amplifier.ui.switches_ = [];


/**
 * The UI knobs.
 * @type {!Object.<string, !amplifier.ui.Knob>}
 * @private
 */
amplifier.ui.knobs_ = {};


/**
 * Initializes the UI.
 */
amplifier.ui.init = function() {
  amplifier.ui.canvas = document.getElementById('amplifier-canvas');
  amplifier.ui.context = amplifier.ui.canvas.getContext('2d');

  amplifier.ui.chalk.init();
  amplifier.ui.resizeCanvas();

  var switchX = amplifier.ui.constants.borderSize * 2 + 50;
  amplifier.ui.switches_.push(new amplifier.ui.Switch(switchX, 'POWER', ['POWER', 'ON']));
  amplifier.ui.switches_.push(new amplifier.ui.Switch(switchX + 150, 'SOUND', ['STANDBY', 'ON']));

  var knobDelta = 150;
  amplifier.ui.knobs_.volume = new amplifier.ui.Knob(-knobDelta * 5, 0.0, 'VOLUME', 'VOLUME');
  amplifier.ui.knobs_.distortion = new amplifier.ui.Knob(-knobDelta * 4, 1.0, 'DISTORTION', 'DISTORTION');
  amplifier.ui.knobs_.bass = new amplifier.ui.Knob(-knobDelta * 3, 1.0, 'BASS', 'BASS');
  amplifier.ui.knobs_.middle = new amplifier.ui.Knob(-knobDelta * 2, 1.0, 'MIDDLE', 'MIDDLE');
  amplifier.ui.knobs_.treble = new amplifier.ui.Knob(-knobDelta, 1.0, 'TREBLE', 'TREBLE');
  amplifier.ui.knobs_.reverb = new amplifier.ui.Knob(0.0, 0.4, 'REVERB', 'REVERB');
  amplifier.ui.redraw();
};


/**
 * Gets a knob by its name.
 * @param {string} knobName The knob name to be looked for.
 * @return {!amplifier.ui.Knob} The knob.
 */
amplifier.ui.getKnob = function(knobName) {
  return amplifier.ui.knobs_[knobName];
};


/**
 * Resize the canvas to fit the whole document.
 */
amplifier.ui.resizeCanvas = function() {
  amplifier.ui.canvas.width = document.width;
  amplifier.ui.canvas.height = document.height;
};


/**
 * Clears the canvas.
 */
amplifier.ui.clear = function() {
  amplifier.ui.resizeCanvas();
  amplifier.ui.context.fillStyle = amplifier.ui.background;
  amplifier.ui.context.fillRect(0, 0, amplifier.ui.canvas.width, amplifier.ui.canvas.height);
};


/**
 * Redraws the UI.
 */
amplifier.ui.redraw = function() {
  amplifier.ui.requestAnimationFrame_.call(window, function() {
    amplifier.ui.clear();
    amplifier.ui.redrawBorder();
    amplifier.ui.redrawGrid();
    amplifier.ui.redrawLogo();
    amplifier.ui.redrawSwitches();
    amplifier.ui.redrawKnobs();
  });
};


/**
 * Amplifier border size.
 * @type {number}
 */
amplifier.ui.constants.borderSize = 50;


/**
 * Amplifier border radius.
 */
amplifier.ui.constants.radius = 50;


/**
 * Amplifier controls height.
 */
amplifier.ui.constants.controlsHeight = 250;


/**
 * Redraws the amplifier border.
 */
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


/**
 * Redraws the amplifier grid.
 */
amplifier.ui.redrawGrid = function() {
  var ctx = amplifier.ui.context;
  var x = amplifier.ui.constants.borderSize + amplifier.ui.constants.radius;
  var y = amplifier.ui.constants.borderSize + amplifier.ui.constants.radius;
  var w = amplifier.ui.canvas.width - (x * 2);
  var h = amplifier.ui.canvas.height - (y * 2) - amplifier.ui.constants.controlsHeight;

  amplifier.ui.chalk.rect(x, y, w, h);
  amplifier.ui.chalk.rectWithBleed(x, y, w, h, 1, 15);
};


/**
 * Redraws the amplifier logo.
 */
amplifier.ui.redrawLogo = function() {
  var logoX = amplifier.ui.constants.borderSize * 2 - 20;
  var logoY = amplifier.ui.canvas.height - amplifier.ui.constants.controlsHeight - 25;
  amplifier.ui.chalk.text('Amplifier', logoX, logoY, 'italic 50pt serif');
  amplifier.ui.chalk.text('by Rui Lopes', logoX + 260, logoY, 'italic 13pt serif');
  var x = amplifier.ui.constants.borderSize - 15;
  var w = amplifier.ui.canvas.width - x;
  amplifier.ui.chalk.line(x, logoY, w, logoY, 1);
};


/**
 * Redraws a generic amplifier knob.
 */
amplifier.ui.redrawGenericKnob = function(x, y, angle) {
  amplifier.ui.chalk.circle(x, y, 50);
  amplifier.ui.chalk.lineAngle(x, y, 70, angle);
};


/**
 * Redraws all amplifier switches.
 */
amplifier.ui.redrawSwitches = function() {
  for (var i = 0; i < amplifier.ui.switches_.length; ++i) {
    amplifier.ui.switches_[i].render();
  }

  var switchX = amplifier.ui.constants.borderSize * 2 + 50;
  var switchY = amplifier.ui.canvas.height - amplifier.ui.constants.controlsHeight + 100;
  var x = amplifier.ui.constants.borderSize - 15;
  var w = amplifier.ui.canvas.width - x;
  amplifier.ui.chalk.line(x, switchY, w, switchY, 1);
};


/**
 * Redraws all amplifier knobs.
 */
amplifier.ui.redrawKnobs = function() {
  for (var knobName in amplifier.ui.knobs_) {
    amplifier.ui.knobs_[knobName].render();
  }
};


/**
 * Default chalk line width.
 * @type {number}
 */
amplifier.ui.chalk.lineWidth = 10;


/**
 * Chalk pattern.
 * @type {CanvasPattern}
 */
amplifier.ui.chalk.pattern = null;


/**
 * Creates the chalk pattern.
 * @return {!CanvasPattern}
 */
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


/**
 * Initializes the chalk UI.
 */
amplifier.ui.chalk.init = function() {
  amplifier.ui.chalk.pattern = amplifier.ui.chalk.createPattern();
};


/**
 * Draws a generic shape in the chalk UI.
 * @param {function(number=)} shapeFunction The shape function that will guide drawing.
 * @param {number=} opt_lineWidth The line width for this shape.
 */
amplifier.ui.chalk.shape = function(shapeFunction, opt_lineWidth) {
  var ctx = amplifier.ui.context;
  ctx.save();
  ctx.fillStyle = amplifier.ui.chalk.pattern;
  shapeFunction(opt_lineWidth || amplifier.ui.chalk.lineWidth);
  ctx.fill();
  ctx.restore();
};


/**
 * Draws a text shape in the chalk UI.
 * @param {string} text The text to be drawn.
 * @param {number} x1 The horizontal position for the text.
 * @param {number} y1 The vertical position for the text.
 * @param {string=} opt_font An optional font for this text.
 * @param {string=} opt_align An optional alignment for this text.
 * @param {string=} opt_baseline An optional baseline for this text.
 */
amplifier.ui.chalk.text = function(text, x1, y1, opt_font, opt_align, opt_baseline) {
  var ctx = amplifier.ui.context;
  amplifier.ui.chalk.shape(function() {
    ctx.font = opt_font || '10px sans-serif';
    ctx.textAlign = opt_align || 'start';
    ctx.textBaseline = opt_baseline || 'alphabetic';
    ctx.fillText(text, x1, y1);
  });
};


/**
 * Draws an arc shape in the chalk UI.
 * @param {number} xc The horizontal center for this arc.
 * @param {number} yc The vertical center for this arc.
 * @param {number} r The radius for this arc.
 * @param {number} ia The initial angle for this arc.
 * @param {number} ea The ending angle for this arc.
 * @param {number=} opt_lineWidth The line width for this arc.
 */
amplifier.ui.chalk.arc = function(xc, yc, r, ia, ea, opt_lineWidth) {
  var ctx = amplifier.ui.context;
  amplifier.ui.chalk.shape(function(lineWidth) {
    ctx.beginPath();
    ctx.arc(xc, yc, r + lineWidth/2, ia, ea, true);
    ctx.arc(xc, yc, r - lineWidth/2, ea, ia, false);
    ctx.closePath();
  }, opt_lineWidth);
};


/**
 * Draws a circle shape in the chalk UI.
 * @param {number} xc The horizontal center for this circle.
 * @param {number} yc The vertical center for this circle.
 * @param {number} r The radius for this circle.
 * @param {number=} opt_lineWidth The line width for this circle.
 */
amplifier.ui.chalk.circle = function(xc, yc, r, opt_lineWidth) {
  amplifier.ui.chalk.arc(xc, yc, r, 0, Math.PI * 2, opt_lineWidth);
};


/**
 * Draws a circle shape with a visible center cross in the chalk UI.
 * @param {number} xc The horizontal center for this circle.
 * @param {number} yc The vertical center for this circle.
 * @param {number} r The radius for this circle.
 * @param {number=} opt_lineWidth The line width for this circle.
 */
amplifier.ui.chalk.circleWithCenter = function(xc, yc, r, opt_lineWidth) {
  amplifier.ui.chalk.circle(xc, yc, r, opt_lineWidth);
  amplifier.ui.chalk.line(xc - 5, yc, xc + 5, yc, 1);
  amplifier.ui.chalk.line(xc, yc - 5, xc, yc + 5, 1);
};


/**
 * Draws a line with a specific angle in the chalk UI.
 * @param {number} x1 The initial horizontal position for the line.
 * @param {number} y1 The initial vertical position for the line.
 * @param {number} size The line size.
 * @param {number} angle The line angle.
 * @param {number=} opt_lineWidth The line width.
 */
amplifier.ui.chalk.lineAngle = function(x1, y1, size, angle, opt_lineWidth) {
  var ctx = amplifier.ui.context;
  amplifier.ui.chalk.shape(function(lineWidth) {
    var lw2 = lineWidth * 0.5;
    ctx.translate(x1, y1);
    ctx.rotate(angle);
    ctx.translate(-lw2, -lw2);
    ctx.beginPath();
    ctx.rect(0, 0, size, lineWidth);
    ctx.closePath();
  }, opt_lineWidth);
};


/**
 * Draws a line between two points in the chalk UI.
 * @param {number} x1 The initial horizontal position for the line.
 * @param {number} y1 The initial vertical position for the line.
 * @param {number} x2 The final horizontal position for the line.
 * @param {number} y2 The final vertical position for the line.
 * @param {number=} opt_lineWidth The line width.
 */
amplifier.ui.chalk.line = function(x1, y1, x2, y2, opt_lineWidth) {
  lineWidth = opt_lineWidth || amplifier.ui.chalk.lineWidth;
  var xx = x2 - x1;
  var yy = y2 - y1;
  var size = Math.sqrt(xx * xx + yy * yy) + lineWidth;
  var angle = Math.atan2(yy, xx);
  amplifier.ui.chalk.lineAngle(x1, y1, size, angle, lineWidth);
};


/**
 * Draws a rectangle with bleeding lines in the chalk UI.
 * @param {number} x1 The initial horizontal position for the rectangle.
 * @param {number} y1 The initial vertical position for the rectangle.
 * @param {number} w The width for the rectangle.
 * @param {number} h The height for the rectangle.
 * @param {number} lineWidth The line width for the rectangle.
 * @param {number} bleed The bleed for the rectangle.
 */
amplifier.ui.chalk.rectWithBleed = function(x1, y1, w, h, lineWidth, bleed) {
  var x2 = x1 + w;
  var y2 = y1 + h;
  amplifier.ui.chalk.line(x1 - bleed, y1, x2 + bleed, y1, lineWidth);
  amplifier.ui.chalk.line(x1, y1 - bleed, x1, y2 + bleed, lineWidth);
  amplifier.ui.chalk.line(x2, y1 - bleed, x2, y2 + bleed, lineWidth);
  amplifier.ui.chalk.line(x1 - bleed, y2, x2 + bleed, y2, lineWidth);
};


/**
 * Draws a rectangle in the chalk UI.
 * @param {number} x1 The initial horizontal position for the rectangle.
 * @param {number} y1 The initial vertical position for the rectangle.
 * @param {number} w The width for the rectangle.
 * @param {number} h The height for the rectangle.
 * @param {number=} opt_lineWidth The line width for the rectangle.
 */
amplifier.ui.chalk.rect = function(x1, y1, w, h, opt_lineWidth) {
  amplifier.ui.chalk.rectWithBleed(x1, y1, w, h, opt_lineWidth, 0);
};


/**
 * Draws a rounded rectangle in the chalk UI.
 * @param {number} x1 The initial horizontal position for the rectangle.
 * @param {number} y1 The initial vertical position for the rectangle.
 * @param {number} w The width for the rectangle.
 * @param {number} h The height for the rectangle.
 * @param {number} r The radius for rounded corners in the rectangle.
 * @param {number=} opt_lineWidth The line width for the rectangle.
 */
amplifier.ui.chalk.roundRect = function(x1, y1, w, h, r, opt_lineWidth) {
  var x2 = x1 + w;
  var y2 = y1 + h;
  amplifier.ui.chalk.arc(x1 + r, y1 + r, r, -Math.PI / 2, Math.PI, opt_lineWidth);
  amplifier.ui.chalk.line(x1 + r, y1, x2 - r, y1, opt_lineWidth);
  amplifier.ui.chalk.arc(x2 - r, y1 + r, r, 0, -Math.PI / 2, opt_lineWidth);
  amplifier.ui.chalk.line(x1, y1 + r, x1, y2 - r, opt_lineWidth);
  amplifier.ui.chalk.line(x2, y1 + r, x2, y2 - r, opt_lineWidth);
  amplifier.ui.chalk.arc(x1 + r, y2 - r, r, Math.PI, Math.PI / 2, opt_lineWidth);
  amplifier.ui.chalk.line(x1 + r, y2, x2 - r, y2, opt_lineWidth);
  amplifier.ui.chalk.arc(x2 - r, y2 - r, r, Math.PI / 2, 0, opt_lineWidth);
};


/**
 * A map of bound event handlers.
 * @type {!Object.<string, !Array.<{
 *     within: function(number, number): boolean,
 *     handler: function()}>
 * }
 */
amplifier.ui.events.handlers_ = {};


/**
 * The global event handler.
 * @type {!Event} event The event being handled.
 */
amplifier.ui.events.globalHandler = function(event) {
  var typeHandlers = amplifier.ui.events.handlers_[event.type];
  for (var id in typeHandlers) {
    var idHandler = typeHandlers[id];
    if (idHandler && idHandler.within(event.clientX, event.clientY)) {
      idHandler.handler(event);
    }
  }
};


/**
 * Sets an event handler for a given id.
 * @param {string} type The event type to be handled.
 * @param {string} id The id being handled.
 * @param {function(number, number): boolean} within A 2D bound checking function.
 * @param {function()} handler The handler to be invoked.
 */
amplifier.ui.events.setHandler = function(type, id, within, handler) {
  amplifier.ui.events.handlers_[type] = amplifier.ui.events.handlers_[type] || {};
  amplifier.ui.events.handlers_[type][id] = amplifier.ui.events.handlers_[type][id] || {
    within: within,
    handler: handler
  };
};



/**
 * A generic switch.
 * @type {number} x The horizontal location for this switch.
 * @type {string} id Identifier for this switch.
 * @type {!Array.<string>} labels The labels for this switch.
 * @constructor
 */
amplifier.ui.Switch = function(x, id, labels) {
  /**
   * The switch state.
   * @type {boolean}
   * @private
   */
  this.state_ = false;

  /**
   * @type {number}
   * @private
   */
  this.x_ = x;

  /**
   * @type {string}
   * @private
   */
  this.id_ = id;

  /**
   * @type {!Array.<string>}
   * @private
   */
  this.labels_ = labels;

  lib.msg.listen('SWITCH_FAILURE', this.handleFailure.bind(this));
};


/**
 * Sets the state for this switch.
 * @type {boolean} newState The new state.
 */
amplifier.ui.Switch.prototype.setState = function(newState) {
  this.state_ = !!newState;
  amplifier.ui.redraw();
  lib.msg.send('SWITCH_STATE', this.id_, this.state_);
};


/**
 * Handles a failure on toggling this switch.
 * @param {string} The id that triggered the failure.
 */
amplifier.ui.Switch.prototype.handleFailure = function(id) {
  if (id == this.id_) {
    this.state_ = false;
    amplifier.ui.redraw();
  }
};


/**
 * Renders this switch.
 */
amplifier.ui.Switch.prototype.render = function() {
  var switchX = this.x_;
  var switchY = amplifier.ui.canvas.height - amplifier.ui.constants.controlsHeight + 100;
  var switchRadius = 50;
  amplifier.ui.redrawGenericKnob(switchX, switchY, (this.state_ ? -1 : 1) * Math.PI / 2);
  amplifier.ui.chalk.text(
      this.labels_[0], switchX, switchY + 80, '12pt sans-serif', 'center', 'middle');
  amplifier.ui.chalk.text(
      this.labels_[1], switchX, switchY - 80, '12pt sans-serif', 'center', 'middle');

  amplifier.ui.events.setHandler(
      'click', this.id_, this.isWithin.bind(this), this.handleClick.bind(this));
};


/**
 * Checks if a given position is within this switch.
 * @param {number} x The horizontal position.
 * @param {number} y The vertical position.
 * @return {boolean} If position within this switch.
 */
amplifier.ui.Switch.prototype.isWithin = function(x, y) {
  var switchX = this.x_;
  var switchY = amplifier.ui.canvas.height - amplifier.ui.constants.controlsHeight + 100;
  var switchRadius = 50;
  var xx = switchX - x;
  var yy = switchY - y;
  var distance = Math.sqrt(xx * xx + yy * yy);
  return distance <= switchRadius;
};


/**
 * Handlers a click on this switch.
 */
amplifier.ui.Switch.prototype.handleClick = function() {
  this.setState(!this.state_);
};



/**
 * A generic knob.
 * @type {number} x The horizontal location for this switch.
 * @type {number} value The initial value for this knob.
 * @type {string} id Identifier for this switch.
 * @type {string} label The labels for this switch.
 * @constructor
 */
amplifier.ui.Knob = function(x, value, id, label) {
  /**
   * @type {number}
   * @private
   */
  this.value_ = value;

  /**
   * @type {number}
   * @private
   */
  this.x_ = x;

  /**
   * @type {string}
   * @private
   */
  this.id_ = id;

  /**
   * @type {string}
   * @private
   */
  this.label_ = label;

  /**
   * @type {boolean}
   * @private
   */
  this.isMouseMoveTarget_ = false;

  /**
   * @type {number}
   * @private
   */
  this.mouseDownY_;

  /**
   * @type {number}
   * @private
   */
  this.mouseDownValue_;

  /**
   * @type {boolean}
   * @private
   */
  this.skipClick_ = false;

  this.setValue(this.value_);
};


/**
 * Sets the value for this knob.
 * @param {number} newValue The new value to be set.
 */
amplifier.ui.Knob.prototype.setValue = function(newValue) {
  this.value_ = lib.math.clamp(newValue, 0.0, 1.0);
  amplifier.ui.redraw();
  lib.msg.send('KNOB_VALUE', this.id_, this.value_);
};


/**
 * Computes the X position for this knob.
 * @return {number} The computed X position.
 */
amplifier.ui.Knob.prototype.computeX = function() {
  return this.x_ > 0 ?
      this.x_ :
      amplifier.ui.canvas.width - amplifier.ui.constants.borderSize * 2 - 50 + this.x_;
};

/**
 * Renders this knob.
 */
amplifier.ui.Knob.prototype.render = function() {
  var knobX = this.computeX();
  var knobY = amplifier.ui.canvas.height - amplifier.ui.constants.controlsHeight + 100;
  var knobRadius = 50;
  var angle = Math.PI * 0.75 + this.value_ * Math.PI * 1.5;
  amplifier.ui.redrawGenericKnob(knobX, knobY, angle);
  amplifier.ui.chalk.text(this.label_, knobX, knobY + 80, '12pt sans-serif', 'center', 'middle');

  for (var valueLabel = 1; valueLabel < 12; ++valueLabel) {
    var currentLabel = valueLabel.toString();
    var currentAngle = Math.PI * 0.75 + (valueLabel - 1) * Math.PI * 0.15;
    var distance = knobRadius + 15;
    var currentLabelX = knobX + Math.cos(currentAngle) * distance;
    var currentLabelY = knobY + Math.sin(currentAngle) * distance;
    amplifier.ui.chalk.text(
        currentLabel, currentLabelX, currentLabelY, '10pt sans-serif', 'center', 'middle');
  }

  amplifier.ui.events.setHandler(
      'click', this.id_, this.isWithin.bind(this), this.handleClick.bind(this));

  amplifier.ui.events.setHandler(
      'mousedown', this.id_, this.isWithin.bind(this), this.handleMouseDown.bind(this));

  amplifier.ui.events.setHandler(
      'mousemove', this.id_, lib.functions.TRUE, this.handleMouseMove.bind(this));

  amplifier.ui.events.setHandler(
      'mouseup', this.id_, lib.functions.TRUE, this.handleMouseUp.bind(this));
};


/**
 * Checks if a given position is within this knob.
 * @param {number} x The horizontal position.
 * @param {number} y The vertical position.
 * @return {boolean} If position within this knob.
 */
amplifier.ui.Knob.prototype.isWithin = function(x, y) {
  var knobX = this.computeX();
  var knobY = amplifier.ui.canvas.height - amplifier.ui.constants.controlsHeight + 100;
  var knobRadius = 50;
  var xx = knobX - x;
  var yy = knobY - y;
  var distance = Math.sqrt(xx * xx + yy * yy);
  return distance <= knobRadius;
};


/**
 * Handles a click on this knob.
 */
amplifier.ui.Knob.prototype.handleClick = function() {
  if (this.skipClick_) {
    this.skipClick_ = false;
    return;
  }
  var nextValue = Math.floor((this.value_ * 10 + 1) % 11) / 10;
  this.setValue(nextValue);
};


/**
 * Handles a mousedown on this knob.
 * @param {!Event} event The generated mousemove event.
 */
amplifier.ui.Knob.prototype.handleMouseDown = function(event) {
  this.isMouseMoveTarget_ = true;
  this.mouseDownY_ = event.clientY;
  this.mouseDownValue_ = this.value_;
};


/**
 * Handles a mouseup on this knob.
 */
amplifier.ui.Knob.prototype.handleMouseUp = function() {
  this.isMouseMoveTarget_ = false;
};


/**
 * Handles a mousemove on this knob.  This is the main event handling point that changes this
 * knob's value.
 * @param {!Event} event The generated mousemove event.
 */
amplifier.ui.Knob.prototype.handleMouseMove = function(event) {
  if (!this.isMouseMoveTarget_) {
    return;
  }

  this.skipClick_ = true;

  var value = this.mouseDownValue_ + (this.mouseDownY_ - event.clientY) / 200;
  this.setValue(value);
};


/**
 * An Amplifier configuration type.
 * @typedef {
 *   volume: number,
 *   distortion: number,
 *   bass: number,
 *   middle: number,
 *   treble: number,
 *   reverb: number
 * }
 */
amplifier.config.Config;


/**
 * The default Amplifier configuration.
 * @type {!amplifier.config.Config}
 * @const
 */
amplifier.config.DEFAULT = {
  volume: 0.4,
  distortion: 0.4,
  bass: 0.4,
  middle: 0.7,
  treble: 0.9,
  reverb: 0.2
};


/**
 * Initializes the Amplifier configuration (i.e., knob positions).
 */
amplifier.config.init = function() {
  amplifier.config.load(amplifier.config.DEFAULT);
  amplifier.config.bindDragAndDrop();
};


/**
 * Binds drag and drop events.
 */
amplifier.config.bindDragAndDrop = function() {
  var canvas = document.getElementById('amplifier-canvas');
  canvas.addEventListener('dragover', amplifier.config.handleDragOver, false);
  canvas.addEventListener('drop', amplifier.config.handleDrop, false);
};


/**
 * Handles drag over event.
 * @param {!Event} event The drag over event.
 */
amplifier.config.handleDragOver = function(event) {
  event.stopPropagation();
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
};


/**
 * Handles drop event.
 * @param {!Event} event The drop event.
 */
amplifier.config.handleDrop = function(event) {
  event.stopPropagation();
  event.preventDefault();

  var files = event.dataTransfer.files;
  if (files.length < 1) {
    return;
  }

  var configFile = files[0];
  if (!configFile || !configFile.name || !configFile.name.match(/.+\.amplifier$/)) {
    amplifier.core.error('Invalid configuration file (should end in .amplifier)');
    return;
  }

  var configReader = new FileReader();
  configReader.onload = amplifier.config.readFile;
  configReader.readAsText(configFile);
};


/**
 * Validates a configuration field.  If it is invalid, an exception is thrown.
 * @private
 */
amplifier.config.validateField_ = function(configField) {
  if (typeof configField != 'number') {
    throw new Error();
  }
};


/**
 * Parses and validates the content of a configuration file.
 * @param {string} fileContent The content of the configuration file
 * @return {!amplifier.config.Config} A configuration object, if the file contents are valid.
 *     Otherwise an exception is thrown.
 */
amplifier.config.validate = function(fileContent) {
  var config;
  try {
    config = /** @type {!amplifier.config.Config} */(JSON.parse(fileContent));
    amplifier.config.validateField_(config.volume);
    amplifier.config.validateField_(config.distortion);
    amplifier.config.validateField_(config.bass);
    amplifier.config.validateField_(config.middle);
    amplifier.config.validateField_(config.treble);
    amplifier.config.validateField_(config.reverb);
  } catch (e) {
    // Rethrow, as it'll be handled later.
    throw e;
  }
  return config;
};


/**
 * Reads a config file.
 * @param {!Event} event The file read event.
 */
amplifier.config.readFile = function(event) {
  var fileContent = event.target.result;
  try {
    var config = amplifier.config.validate(fileContent);
    amplifier.config.load(config);
  } catch (e) {
    amplifier.core.error('Invalid configuration');
  }
};


/**
 * Loads an Amplifier configuration.
 * @param {!amplifier.config.Config} config The configuration to be loaded.
 */
amplifier.config.load = function(config) {
  amplifier.ui.getKnob('volume').setValue(config.volume);
  amplifier.ui.getKnob('distortion').setValue(config.distortion);
  amplifier.ui.getKnob('bass').setValue(config.bass);
  amplifier.ui.getKnob('middle').setValue(config.middle);
  amplifier.ui.getKnob('treble').setValue(config.treble);
  amplifier.ui.getKnob('reverb').setValue(config.reverb);
};


// Bind all global events, kicking core initialization on window load.
window.addEventListener('load', amplifier.core.init);
window.addEventListener('unload', amplifier.core.dispose);
window.addEventListener('resize', amplifier.ui.redraw);

// Bind all mouse events to the global event handler.
window.addEventListener('click', amplifier.ui.events.globalHandler);
window.addEventListener('mousedown', amplifier.ui.events.globalHandler);
window.addEventListener('mousemove', amplifier.ui.events.globalHandler);
window.addEventListener('mouseup', amplifier.ui.events.globalHandler);

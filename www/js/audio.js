/* Lumen — synthesised sound. No audio files: everything is generated, so the
   bundle stays tiny and there is nothing to license for the stores. */
(function (root) {
  'use strict';

  var ctx = null, bus = null, enabled = true;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    bus = ctx.createGain();
    bus.gain.value = 0.16;
    bus.connect(ctx.destination);
    return ctx;
  }

  function tone(freq, dur, type, vol, delay, glideTo) {
    if (!enabled) return;
    var c = ensure(); if (!c) return;
    var t0 = c.currentTime + (delay || 0);
    var osc = c.createOscillator();
    var g = c.createGain();
    var lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;

    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);

    var peak = vol === undefined ? 0.5 : vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(lp); lp.connect(g); g.connect(bus);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  root.Sound = {
    unlock: function () { ensure(); },
    set enabled(v) { enabled = !!v; },
    get enabled() { return enabled; },

    turn:   function () { tone(392, 0.10, 'sine', 0.30, 0, 466); },
    connect:function () { tone(659.25, 0.16, 'triangle', 0.22); },
    hint:   function () { tone(523.25, 0.14, 'sine', 0.25); tone(784, 0.20, 'sine', 0.16, 0.09); },
    press:  function () { tone(294, 0.08, 'sine', 0.22); },
    win: function () {
      // A major, rising, with an octave bloom on top
      [440, 554.37, 659.25, 880].forEach(function (f, i) {
        tone(f, 0.9 - i * 0.08, 'triangle', 0.26, i * 0.10);
      });
      tone(1318.5, 1.5, 'sine', 0.10, 0.42);
    }
  };
})(window);

/* Lumen — persistence. Namespaced, versioned, and safe on locked-down browsers. */
(function (root) {
  'use strict';

  var KEY = 'lumen.save.v1';

  var DEFAULTS = {
    level: 1,          // furthest level unlocked
    best: {},          // { levelNumber: moves }
    stars: {},         // { levelNumber: 1..3 }
    started: false,
    settings: {
      theme: 'midnight',
      sound: true,
      haptics: true,
      reducedMotion: false
    }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var state = clone(DEFAULTS);

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object') return;
      state = Object.assign(clone(DEFAULTS), saved);
      state.settings = Object.assign(clone(DEFAULTS.settings), saved.settings || {});
      state.best = saved.best || {};
      state.stars = saved.stars || {};
    } catch (e) { /* private mode, blocked storage — play unsaved */ }
  }

  var pending = null;
  function save() {
    if (pending) return;
    pending = setTimeout(function () {
      pending = null;
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    }, 120);
  }

  function reset() {
    state = clone(DEFAULTS);
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  load();

  root.Store = {
    get state() { return state; },
    save: save,
    reset: reset,
    recordWin: function (level, moves, stars) {
      var prev = state.best[level];
      if (prev === undefined || moves < prev) state.best[level] = moves;
      var ps = state.stars[level] || 0;
      if (stars > ps) state.stars[level] = stars;
      if (level + 1 > state.level) state.level = level + 1;
      save();
    }
  };
})(window);

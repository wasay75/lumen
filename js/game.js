/* Lumen — presentation, input and flow. */
(function (root, doc) {
  'use strict';

  var E = root.Engine, Store = root.Store, Sound = root.Sound;
  var S = Store.state;

  var $ = function (id) { return doc.getElementById(id); };

  var board = $('board'), stage = doc.querySelector('.stage');
  var tiles = [];        // DOM nodes, index-aligned with the grid
  var game = null;       // current puzzle
  var moves = 0, usedHint = 0, locked = false, litPrev = null;

  var STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.6l2.7 6.1 6.6.6-5 4.4 1.5 6.5L12 16.8 6.2 20.2l1.5-6.5-5-4.4 6.6-.6z"/></svg>';

  /* ── settings ───────────────────────────────────────── */
  function applySettings() {
    doc.documentElement.dataset.skin = S.settings.theme;
    doc.documentElement.dataset.motion = S.settings.reducedMotion ? 'reduced' : 'full';
    Sound.enabled = S.settings.sound;
    var meta = doc.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', S.settings.theme === 'ivory' ? '#f6f2e9' : '#0a0b0e');
    $('set-sound').checked = S.settings.sound;
    $('set-haptics').checked = S.settings.haptics;
    $('set-motion').checked = S.settings.reducedMotion;
    Array.prototype.forEach.call($('seg-theme').children, function (b) {
      b.classList.toggle('is-on', b.dataset.theme === S.settings.theme);
    });
  }

  function buzz(ms) {
    if (!S.settings.haptics) return;
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
  }

  /* ── screens & overlays ─────────────────────────────── */
  function show(id) {
    ['screen-title', 'screen-game'].forEach(function (s) {
      $(s).classList.toggle('is-active', s === id);
    });
  }
  function veil(id, on) { $(id).hidden = !on; }

  /* ── tile artwork ───────────────────────────────────── */
  var ARM = ['M50 50 L50 0', 'M50 50 L100 50', 'M50 50 L50 100', 'M50 50 L0 50'];

  function tileSVG(mask) {
    var d = '', arms = 0;
    for (var k = 0; k < 4; k++) {
      if (mask & (1 << k)) { d += ARM[k] + ' '; arms++; }
    }
    // A lone strand ends in a node — the terminals of the circuit.
    var cap = arms === 1 ? '<circle class="node" cx="50" cy="50" r="13"/>' : '';
    return '<svg viewBox="0 0 100 100">' + cap + '<path class="wire" d="' + d.trim() + '"/></svg>';
  }

  /* ── layout ─────────────────────────────────────────── */
  function layout() {
    if (!game) return;
    var chrome = 36;                       // frame padding + hairline border
    var w = stage.clientWidth - 28 - chrome;
    var h = stage.clientHeight - 16 - chrome;
    var size = Math.floor(Math.min(w / game.cols, h / game.rows));
    size = Math.max(30, Math.min(118, size));   // small grids still fill a phone
    board.style.setProperty('--tile', size + 'px');
    board.style.setProperty('--cols', game.cols);
  }

  /* ── rendering ──────────────────────────────────────── */
  function render() {
    board.innerHTML = '';
    board.classList.remove('is-solved');
    tiles = [];
    var frag = doc.createDocumentFragment();

    for (var i = 0; i < game.masks.length; i++) {
      var t = doc.createElement('button');
      t.className = 'tile';
      t.type = 'button';
      t.dataset.i = i;
      t.style.setProperty('--r', (game.rots[i] * 90) + 'deg');
      t.style.setProperty('--d', Math.max(0, game.dist[i]));
      t.setAttribute('aria-label', 'Turn strand');
      t.innerHTML = tileSVG(game.masks[i]);
      if (i === game.root) t.classList.add('is-source');
      tiles.push(t);
      frag.appendChild(t);
    }
    board.appendChild(frag);
    layout();
    litPrev = null;
    paint();
  }

  function paint() {
    var res = E.evaluate(game);
    var gained = 0;
    for (var i = 0; i < tiles.length; i++) {
      var on = !!res.lit[i];
      if (litPrev && !litPrev[i] && on) gained++;
      tiles[i].classList.toggle('is-lit', on);
    }
    litPrev = res.lit;
    return { res: res, gained: gained };
  }

  /* ── turning a strand ───────────────────────────────── */
  function turn(i, dir) {
    if (locked || !game) return;
    game.rots[i] += dir;
    moves++;
    tiles[i].style.setProperty('--r', (game.rots[i] * 90) + 'deg');
    tiles[i].classList.remove('is-hint');
    $('hud-moves').textContent = moves;

    buzz(9);
    Sound.turn();

    var out = paint();
    if (out.gained > 0 && !out.res.solved) Sound.connect();
    if (out.res.solved) win();
  }

  board.addEventListener('pointerdown', function (ev) {
    var t = ev.target.closest ? ev.target.closest('.tile') : null;
    if (!t) return;
    ev.preventDefault();
    Sound.unlock();
    turn(+t.dataset.i, ev.button === 2 ? -1 : 1);
  });
  board.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });

  /* ── level lifecycle ────────────────────────────────── */
  function start(level) {
    game = E.build(level);
    moves = 0; usedHint = 0; locked = false;
    var ch = E.chapterOf(level);
    $('hud-chapter').textContent = 'Chapter ' + ch.numeral + ' · ' + ch.name;
    $('hud-level').textContent = 'Level ' + level;
    $('hud-moves').textContent = '0';
    $('hud-par').textContent = 'par ' + game.par;
    $('hint-label').textContent = 'Hint';
    $('btn-hint').disabled = false;
    show('screen-game');
    render();
  }

  function restart() {
    if (!game) return;
    game.rots = Int16Array.from(game.start);
    moves = 0; usedHint = 0; locked = false;
    $('hud-moves').textContent = '0';
    $('btn-hint').disabled = false;
    $('hint-label').textContent = 'Hint';
    render();
  }

  function win() {
    locked = true;
    board.classList.add('is-solved');
    buzz([12, 60, 26]);
    Sound.win();

    var lvl = game.level;
    var stars = E.starsFor(moves, game.par, usedHint > 0);
    var prevBest = S.best[lvl];
    Store.recordWin(lvl, moves, stars);

    $('win-title').textContent = stars === 3 ? 'Flawless' : 'Complete';
    $('win-moves').textContent = moves;
    $('win-par').textContent = game.par;
    $('win-best').textContent = Math.min(moves, prevBest === undefined ? moves : prevBest);
    $('win-stars').innerHTML = [0, 1, 2].map(function (k) {
      return '<span class="' + (k < stars ? 'on' : '') + '">' + STAR + '</span>';
    }).join('');

    setTimeout(function () { veil('veil-win', true); }, S.settings.reducedMotion ? 200 : 900);
  }

  /* ── hint ───────────────────────────────────────────── */
  function hint() {
    if (locked || !game) return;
    var i = E.findUnsolved(game);
    if (i < 0) return;
    usedHint++;
    Sound.hint();
    var t = tiles[i];
    t.classList.remove('is-hint');
    void t.offsetWidth;                    // restart the pulse
    t.classList.add('is-hint');
    if (usedHint >= 3) {
      $('btn-hint').disabled = true;
      $('hint-label').textContent = 'Spent';
    } else {
      $('hint-label').textContent = 'Hint · ' + (3 - usedHint);
    }
  }

  /* ── title screen ───────────────────────────────────── */
  function refreshTitle() {
    var resuming = S.started && S.level > 1;
    $('play-label').textContent = resuming ? 'Continue' : 'Begin';
    $('btn-newgame').hidden = !resuming;
    var meta = $('title-meta');
    if (resuming) {
      var ch = E.chapterOf(S.level);
      meta.textContent = 'Chapter ' + ch.numeral + ' · Level ' + S.level;
      meta.hidden = false;
    } else {
      meta.hidden = true;
    }
  }

  /* ── wiring ─────────────────────────────────────────── */
  function on(id, fn) { $(id).addEventListener('click', function (e) { Sound.unlock(); Sound.press(); fn(e); }); }

  on('btn-play', function () {
    S.started = true; Store.save();
    start(S.level);
  });
  on('btn-newgame', function () {
    Store.reset();
    S = Store.state;
    applySettings(); refreshTitle();
  });
  on('btn-how', function () { veil('veil-how', true); });
  on('btn-how-close', function () { veil('veil-how', false); });
  on('btn-settings', function () { veil('veil-settings', true); });
  on('btn-settings-close', function () { veil('veil-settings', false); });

  on('btn-home', function () { veil('veil-menu', true); });
  on('btn-resume', function () { veil('veil-menu', false); });
  on('btn-menu-restart', function () { veil('veil-menu', false); restart(); });
  on('btn-menu-settings', function () { veil('veil-menu', false); veil('veil-settings', true); });
  on('btn-menu-home', function () { veil('veil-menu', false); refreshTitle(); show('screen-title'); });

  on('btn-restart', restart);
  on('btn-hint', hint);

  on('btn-next', function () {
    veil('veil-win', false);
    start(game.level + 1);
  });
  on('btn-replay', function () {
    veil('veil-win', false);
    restart();
  });

  $('seg-theme').addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    S.settings.theme = b.dataset.theme;
    Store.save(); applySettings(); Sound.press();
  });
  $('set-sound').addEventListener('change', function (e) {
    S.settings.sound = e.target.checked; Store.save(); applySettings();
    if (e.target.checked) { Sound.unlock(); Sound.connect(); }
  });
  $('set-haptics').addEventListener('change', function (e) {
    S.settings.haptics = e.target.checked; Store.save(); buzz(14);
  });
  $('set-motion').addEventListener('change', function (e) {
    S.settings.reducedMotion = e.target.checked; Store.save(); applySettings();
  });

  doc.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') {
      if (!$('veil-win').hidden) return;
      if (!$('veil-settings').hidden) return veil('veil-settings', false);
      if (!$('veil-how').hidden) return veil('veil-how', false);
      if (!$('veil-menu').hidden) return veil('veil-menu', false);
      if ($('screen-game').classList.contains('is-active')) veil('veil-menu', true);
    }
    if (ev.key === 'r' && $('screen-game').classList.contains('is-active')) restart();
  });

  root.addEventListener('resize', layout);
  root.addEventListener('orientationchange', function () { setTimeout(layout, 120); });

  applySettings();
  refreshTitle();
})(window, document);

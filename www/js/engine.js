/* Lumen — puzzle engine.
   Pure logic, no DOM. Every level is generated from a seed derived from its
   number, so level 42 is the same puzzle on every device, forever. */
(function (root) {
  'use strict';

  // 0 = North, 1 = East, 2 = South, 3 = West
  var DR = [-1, 0, 1, 0];
  var DC = [0, 1, 0, -1];

  function rotate(mask, r) {
    r = ((r % 4) + 4) % 4;
    return ((mask << r) | (mask >> (4 - r))) & 15;
  }

  /* deterministic PRNG (mulberry32) */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), 1 | t);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var CHAPTERS = [
    { from: 1,  name: 'First Light' },
    { from: 7,  name: 'Still Water' },
    { from: 15, name: 'The Gilded Path' },
    { from: 25, name: 'Deep Ember' },
    { from: 39, name: 'The Infinite Loom' }
  ];
  var ROMAN = ['I', 'II', 'III', 'IV', 'V'];

  function chapterOf(level) {
    var i = 0;
    for (var k = 0; k < CHAPTERS.length; k++) if (level >= CHAPTERS[k].from) i = k;
    return { index: i, numeral: ROMAN[i], name: CHAPTERS[i].name };
  }

  /* Board dimensions grow gently, and stay portrait-friendly. */
  function shapeOf(level) {
    var steps = [
      [1,  3, 3], [4,  4, 4], [8,  4, 5], [12, 5, 5], [16, 5, 6],
      [21, 6, 6], [27, 6, 7], [34, 7, 7], [42, 7, 8], [52, 8, 8]
    ];
    var s = steps[0];
    for (var i = 0; i < steps.length; i++) if (level >= steps[i][0]) s = steps[i];
    return { cols: s[1], rows: s[2] };
  }

  /* Chance of an extra edge, which turns the tree into a weave with loops.
     Loops read as more ornamental and are meaningfully harder. */
  function loopinessOf(level) {
    if (level < 10) return 0;
    return Math.min(0.14, (level - 9) * 0.012);
  }

  function build(level) {
    var shape = shapeOf(level);
    var rows = shape.rows, cols = shape.cols, n = rows * cols;
    var rand = rng(level * 2654435761 + 0x9E37);
    var masks = new Uint8Array(n);

    // 1. Randomised depth-first spanning tree — long, sinuous corridors.
    var seen = new Uint8Array(n);
    var root0 = (rand() * n) | 0;
    var stack = [root0];
    seen[root0] = 1;

    while (stack.length) {
      var cur = stack[stack.length - 1];
      var r = (cur / cols) | 0, c = cur % cols;
      var opts = [];
      for (var d = 0; d < 4; d++) {
        var nr = r + DR[d], nc = c + DC[d];
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
        var ni = nr * cols + nc;
        if (seen[ni]) continue;
        opts.push([d, ni]);
      }
      if (!opts.length) { stack.pop(); continue; }
      var pick = opts[(rand() * opts.length) | 0];
      masks[cur] |= 1 << pick[0];
      masks[pick[1]] |= 1 << ((pick[0] + 2) % 4);
      seen[pick[1]] = 1;
      stack.push(pick[1]);
    }

    // 2. Sprinkle extra edges to create loops.
    var loopiness = loopinessOf(level);
    if (loopiness > 0) {
      for (var i = 0; i < n; i++) {
        var ri = (i / cols) | 0, ci = i % cols;
        for (var dd = 1; dd <= 2; dd++) {           // East and South only, no double-counting
          var r2 = ri + DR[dd], c2 = ci + DC[dd];
          if (r2 >= rows || c2 >= cols) continue;
          var j = r2 * cols + c2;
          if (masks[i] & (1 << dd)) continue;
          if (rand() >= loopiness) continue;
          masks[i] |= 1 << dd;
          masks[j] |= 1 << ((dd + 2) % 4);
        }
      }
    }

    // 3. Scramble. Guarantee the board does not open already solved.
    var rots = new Int16Array(n);
    var moved = false;
    for (var k = 0; k < n; k++) {
      var turns = (rand() * 4) | 0;
      rots[k] = turns;
      if (turns && rotate(masks[k], turns) !== masks[k]) moved = true;
    }
    if (!moved) {
      for (var m = 0; m < n; m++) {
        if (rotate(masks[m], 1) !== masks[m]) { rots[m] = 1; break; }
      }
    }

    return {
      level: level, rows: rows, cols: cols, root: root0,
      masks: masks, rots: rots,
      start: Int16Array.from(rots),                 // for Reset
      par: par(masks, rots),
      dist: distances(rows, cols, masks, root0)     // solved-state ripple order
    };
  }

  /* Par is the tap-only cost: a tap turns a strand clockwise, so par counts
     clockwise quarter-turns, honouring each piece's own symmetry (a straight
     strand needs at most one turn, a cross needs none). Reverse-turning with
     a right-click can only ever beat par, never be required to meet it. */
  function par(masks, rots) {
    var total = 0;
    for (var i = 0; i < masks.length; i++) {
      var current = rotate(masks[i], rots[i]);
      for (var k = 1; k < 4; k++) {
        if (rotate(current, k) === masks[i]) { total += k; break; }
      }
    }
    return total;
  }

  /* Distance from the source through the *solved* weave — drives the
     light-sweep animation on victory. */
  function distances(rows, cols, masks, root0) {
    var n = rows * cols;
    var dist = new Int16Array(n).fill(-1);
    var q = [root0], head = 0;
    dist[root0] = 0;
    while (head < q.length) {
      var cur = q[head++];
      var r = (cur / cols) | 0, c = cur % cols;
      for (var d = 0; d < 4; d++) {
        if (!(masks[cur] & (1 << d))) continue;
        var nr = r + DR[d], nc = c + DC[d];
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
        var ni = nr * cols + nc;
        if (dist[ni] !== -1) continue;
        dist[ni] = dist[cur] + 1;
        q.push(ni);
      }
    }
    return dist;
  }

  /* Which tiles carry light, and is the weave whole?
     Solved means: no strand points at a wall or at a bare edge, AND every
     tile is fed from the source. */
  function evaluate(g) {
    var rows = g.rows, cols = g.cols, n = rows * cols;
    var eff = new Uint8Array(n);
    for (var i = 0; i < n; i++) eff[i] = rotate(g.masks[i], g.rots[i]);

    var sealed = true;
    for (var a = 0; a < n; a++) {
      var r = (a / cols) | 0, c = a % cols;
      for (var d = 0; d < 4; d++) {
        if (!(eff[a] & (1 << d))) continue;
        var nr = r + DR[d], nc = c + DC[d];
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) { sealed = false; continue; }
        if (!(eff[nr * cols + nc] & (1 << ((d + 2) % 4)))) sealed = false;
      }
    }

    var lit = new Uint8Array(n);
    var q = [g.root], head = 0;
    lit[g.root] = 1;
    var litCount = 1;
    while (head < q.length) {
      var cur = q[head++];
      var cr = (cur / cols) | 0, cc = cur % cols;
      for (var e = 0; e < 4; e++) {
        if (!(eff[cur] & (1 << e))) continue;
        var mr = cr + DR[e], mc = cc + DC[e];
        if (mr < 0 || mc < 0 || mr >= rows || mc >= cols) continue;
        var mi = mr * cols + mc;
        if (lit[mi]) continue;
        if (!(eff[mi] & (1 << ((e + 2) % 4)))) continue;
        lit[mi] = 1; litCount++; q.push(mi);
      }
    }

    return { lit: lit, litCount: litCount, solved: sealed && litCount === n };
  }

  /* A tile that is not yet in a solved orientation — used by Hint. */
  function findUnsolved(g, rand) {
    var wrong = [];
    for (var i = 0; i < g.masks.length; i++) {
      if (rotate(g.masks[i], g.rots[i]) !== g.masks[i]) wrong.push(i);
    }
    if (!wrong.length) return -1;
    return wrong[((rand ? rand() : Math.random()) * wrong.length) | 0];
  }

  function turnsToSolve(g, i) {
    for (var k = 1; k <= 4; k++) {
      if (rotate(g.masks[i], g.rots[i] + k) === g.masks[i]) return k;
    }
    return 0;
  }

  function starsFor(moves, par, usedHint) {
    if (usedHint) return moves <= Math.ceil(par * 1.35) ? 2 : 1;
    if (moves <= par) return 3;
    if (moves <= Math.ceil(par * 1.35)) return 2;
    return 1;
  }

  root.Engine = {
    DR: DR, DC: DC,
    rotate: rotate,
    build: build,
    evaluate: evaluate,
    chapterOf: chapterOf,
    findUnsolved: findUnsolved,
    turnsToSolve: turnsToSolve,
    starsFor: starsFor
  };
})(window);

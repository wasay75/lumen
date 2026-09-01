# Lumen — a quiet puzzle of light

A calm, elegant connection puzzle. Every level is a woven circuit that has been
pulled apart; you turn each strand until the light runs through the whole weave.

- **Zero dependencies.** No frameworks, no build step, no fonts or images fetched
  from anywhere. Three small scripts and one stylesheet.
- **Infinite, deterministic levels.** Level *n* is generated from a seed derived
  from *n*, so level 42 is the same puzzle on every device, forever — and the
  whole game weighs ~50 KB instead of shipping level data.
- **Every level is provably solvable.** Boards are built as a spanning weave and
  then scrambled, so a solution always exists, and the generator refuses to hand
  you a board that opens already solved.
- **Built for phones first**, and ready to wrap for the App Store and Play Store.

---

## Play it now

### **<https://wasay75.github.io/lumen/>**

That one link installs on every platform, and once installed the game runs with
no connection at all.

| | how to install |
|---|---|
| **iPhone / iPad** | Open the link in **Safari** → **Share** → **Add to Home Screen**. Chrome on iOS cannot install web apps; it has to be Safari. |
| **Android** | Open in **Chrome** → tap **Install** on the title screen, or **⋮ → Install app**. |
| **Mac** | **Safari** → **File → Add to Dock**, or **Chrome/Edge** → **Install** on the title screen. |
| **Windows** | **Chrome** or **Edge** → **Install** on the title screen, or the install icon in the address bar. It lands in the Start menu. |

Installed, it gets its own icon and window, hides the browser chrome, and works
on a plane. Progress lives on the device.

### Locally, while developing

```bash
python3 serve.py
```

Then open <http://localhost:5180>. To play on your phone over the same Wi‑Fi, use
your Mac's LAN address instead of `localhost` — the server already listens on all
interfaces.

There is also a single self-contained file at `dist/lumen.html` (one HTML file
with everything inlined) — AirDrop it to a phone and it plays offline, no server,
no install.

### Redeploying

The repo root *is* the deployed site, so a push updates the live game:

```bash
git add -A && git commit -m "..." && git push
```

`tools/package-www.py` stamps a fresh cache name into `www/sw.js` for the native
build; the hosted `sw.js` revalidates in the background, so players pick up a new
version on their next launch.

---

## How it plays

| | |
|---|---|
| **Tap a strand** | turns it one quarter-turn clockwise |
| **Right-click** | turns it counter-clockwise (desktop convenience only) |
| **Goal** | no strand may point at a wall or at nothing, and every tile must be fed from the source |
| **Par** | the fewest *taps* needed — reach it for three stars |
| **Hints** | three per level; using one caps you at two stars |

The source tile is the one that starts lit. Light spreads outward as you connect
the weave, so the board tells you how close you are without a word of UI.

---

## Layout

```
index.html               markup and screens
css/styles.css           the whole visual system, themed by CSS custom properties
js/storage.js            progress and settings (localStorage, fails soft)
js/audio.js              synthesised sound — no audio files to license
js/engine.js             pure puzzle logic: generation, lighting, par, stars
js/game.js               rendering, input, screen flow
sw.js                    offline cache for the installed app
js/install.js            install prompt + service-worker registration
icons/                   app icons, generated
tools/build.py           → dist/lumen.html   (one self-contained file)
tools/package-www.py     → www/              (what Capacitor wraps)
tools/make-icons.py      → icons/*.png       (pure-stdlib PNG renderer)
serve.py                 local static server for play-testing
capacitor.config.json    native shell configuration
```

### The engine in one paragraph

Each tile holds a 4-bit mask of its connectors (N/E/S/W) plus a rotation count.
A randomised depth-first spanning tree over the grid guarantees one connected
weave; from level 10 a few extra edges are sprinkled in to form loops, which read
as more ornamental and play harder. Scrambling is per-tile rotation. Solving is
checked in one pass: every connector must meet a matching connector, and a
breadth-first flood from the source must reach every tile.

Tuning knobs all live in `js/engine.js`: `shapeOf` (grid size per level),
`loopinessOf` (how tangled), `CHAPTERS` (names and thresholds), `starsFor`.

---

## Shipping to the App Store and Play Store

The game is a plain web app, so [Capacitor](https://capacitorjs.com) wraps it in
a real native shell — a genuine `.ipa` and `.aab`, not a browser bookmark.

**One-time setup** (needs Node, Xcode for iOS, Android Studio for Android):

```bash
npm init -y && npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
```

**Every time you want to build:**

```bash
python3 tools/package-www.py && npx cap sync
```

Then `npx cap open ios` or `npx cap open android` and build from Xcode / Android
Studio as usual. `capacitor.config.json` is already filled in — change `appId`
to a domain you control before you submit, since it cannot be changed later.

### Before you submit

- **`appId`** — reverse-domain, e.g. `com.yourname.lumen`. Permanent once live.
- **Icons** — `icons/icon-1024.png` is the App Store artwork; run
  `python3 tools/make-icons.py` after any change to the mark.
- **Screenshots** — both stores want them at several device sizes. Capture from
  the simulator with the Ivory and Midnight themes for variety.
- **Privacy** — the game collects nothing, has no network calls, no analytics,
  no accounts. Answer "no data collected" on both store forms; that is a real
  competitive advantage in the puzzle category, so say it on the listing.
- **Age rating** — 4+ / Everyone.
- **Android** — Play requires a signed `.aab` and a privacy policy URL even for
  apps that collect nothing.

### Natural places to grow

- Level select with a chapter grid, once there are enough levels to browse.
- Daily puzzle — the generator is already seeded, so seed it with the date.
- A timed mode, or a move-limited "perfect" mode, for players who want pressure.
- iCloud / Play Games save sync, replacing `js/storage.js`'s localStorage calls.

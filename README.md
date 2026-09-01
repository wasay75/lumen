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
android/                 native Android project (Capacitor)
ios/                     native Xcode project (Capacitor)
js/install.js            install prompt + service-worker registration
icons/                   app icons, generated
tools/build.py           → dist/lumen.html   (one self-contained file)
tools/package-www.py     → www/              (what Capacitor wraps)
tools/make-icons.py      → icons/*.png       (pure-stdlib PNG renderer)
tools/make-native-assets.py  → launcher icons and splashes for both platforms
tools/render.py          the mark, drawn to pixels; shared by both generators
tools/env.sh             puts the local Node/JDK/Android toolchain on PATH
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

## Building the native apps

The toolchain is already installed on this Mac, under your home folder — no
Homebrew, nothing system-wide, no admin password was needed:

| | | |
|---|---|---|
| Node 24 LTS | `~/.local/node` | 52 MB |
| Temurin JDK 21 | `~/.local/jdk21` | 185 MB |
| Android SDK 36 | `~/Library/Android/sdk` | ~700 MB |
| Capacitor 8 | `node_modules/` | — |

Load it into a shell with:

```bash
source tools/env.sh
```

### Android

```bash
npm run sync && cd android && ./gradlew assembleDebug
```

The APK lands in `android/app/build/outputs/apk/debug/app-debug.apk`. To put it
on a phone, either copy the file across and open it (Android will ask you to
allow installs from that source), or with USB debugging on:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

**For Play Store you need a release build, which needs your own signing key.**
Create it yourself so nobody else ever holds the password:

```bash
keytool -genkey -v -keystore lumen-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias lumen
```

Keep that file and its password safe and backed up — lose it and you can never
update the app again. Then add a `signingConfigs` block to
`android/app/build.gradle` pointing at it, and run `./gradlew bundleRelease` to
get the `.aab` that Play Console wants.

### iOS

The Xcode project is generated and waiting at `ios/App/App.xcodeproj`. Capacitor
8 uses Swift Package Manager, so there is no CocoaPods step.

**It cannot be built on this Mac yet.** Only the Command Line Tools are
installed, and `xcodebuild` needs the full Xcode:

```
xcode-select: error: tool 'xcodebuild' requires Xcode, but active developer
directory '/Library/Developer/CommandLineTools' is a command line tools instance
```

Xcode is a ~10 GB App Store download that needs your Apple ID, so it has to be
you who installs it. One thing to check first: this Mac runs **macOS 14.2**, and
recent Xcode versions require a newer macOS than that — while the App Store
requires apps to be built with a recent SDK. Update macOS first, then install
Xcode, then:

```bash
npm run ios          # syncs the web build and opens Xcode
```

Set your team under **Signing & Capabilities** and press Run. Submitting to the
App Store also needs a paid Apple Developer account ($99/year).

### App artwork

Every icon and splash screen is generated from the same mark the game draws:

```bash
python3 tools/make-native-assets.py
```

Re-run it after any `cap add`, which restores Capacitor's placeholder art.

### Before you submit

- **`appId`** — currently `com.lumen.puzzle`. Change it to a domain you control
  before you submit; it is permanent once the app is live.
- **Screenshots** — both stores want them at several device sizes. Capture with
  the Ivory and Midnight themes for variety.
- **Privacy** — the game collects nothing, has no network calls, no analytics, no
  accounts. Answer "no data collected" on both store forms; that is a real
  competitive advantage in the puzzle category, so say it on the listing too.
- **Age rating** — 4+ / Everyone.
- **Android** — Play requires a signed `.aab` and a privacy policy URL even for
  apps that collect nothing.

### Natural places to grow

- Level select with a chapter grid, once there are enough levels to browse.
- Daily puzzle — the generator is already seeded, so seed it with the date.
- A timed mode, or a move-limited "perfect" mode, for players who want pressure.
- iCloud / Play Games save sync, replacing `js/storage.js`'s localStorage calls.

#!/usr/bin/env python3
"""Generate every icon and splash the native shells need, from Lumen's own mark.

  python3 tools/make-native-assets.py

Writes into android/ and ios/ in place. Safe to re-run after `cap add`, which
restores Capacitor's placeholder art.
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import render  # noqa: E402

ANDROID = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
IOS = os.path.join(ROOT, 'ios', 'App', 'App', 'Assets.xcassets')

# density -> (legacy launcher px, adaptive foreground px)
DENSITIES = [
    ('mdpi',    48,  108),
    ('hdpi',    72,  162),
    ('xhdpi',   96,  216),
    ('xxhdpi',  144, 324),
    ('xxxhdpi', 192, 432),
]

# Android splash art, portrait and landscape, per density
SPLASH = [('mdpi', 320, 480), ('hdpi', 480, 800), ('xhdpi', 720, 1280),
          ('xxhdpi', 960, 1600), ('xxxhdpi', 1280, 1920)]


def android_icons():
    if not os.path.isdir(ANDROID):
        print('  (no android project — skipping)'); return
    for name, legacy, fg in DENSITIES:
        d = os.path.join(ANDROID, 'mipmap-' + name)
        os.makedirs(d, exist_ok=True)
        # Legacy icons are drawn inside their own mask, so the mark is inset —
        # a circle crops far more aggressively than a squircle does.
        render.write_png(os.path.join(d, 'ic_launcher.png'), legacy, legacy,
                         render.render(legacy, 3, mask='squircle', scale=0.86))
        render.write_png(os.path.join(d, 'ic_launcher_round.png'), legacy, legacy,
                         render.render(legacy, 3, mask='circle', scale=0.70))
        # Adaptive foreground: transparent, mark held inside the 66dp safe zone
        # of the 108dp canvas so no launcher's mask can crop it.
        render.write_png(os.path.join(d, 'ic_launcher_foreground.png'), fg, fg,
                         render.render(fg, 2, mask='none', ground=False, scale=0.58))
        print('  mipmap-%-8s %3dpx legacy, %3dpx adaptive' % (name, legacy, fg))

    # Point the adaptive icon at our PNG foreground and a flat ground.
    with open(os.path.join(ANDROID, 'drawable', 'ic_launcher_background.xml'), 'w') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n'
                '<shape xmlns:android="http://schemas.android.com/apk/res/android"\n'
                '    android:shape="rectangle">\n'
                '    <solid android:color="#0a0b0e" />\n'
                '</shape>\n')
    adaptive = ('<?xml version="1.0" encoding="utf-8"?>\n'
                '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
                '    <background android:drawable="@drawable/ic_launcher_background" />\n'
                '    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n'
                '    <monochrome android:drawable="@mipmap/ic_launcher_foreground" />\n'
                '</adaptive-icon>\n')
    for f_name in ('ic_launcher.xml', 'ic_launcher_round.xml'):
        with open(os.path.join(ANDROID, 'mipmap-anydpi-v26', f_name), 'w') as f:
            f.write(adaptive)
    # Capacitor ships a vector foreground that would win over ours.
    stale = os.path.join(ANDROID, 'drawable-v24', 'ic_launcher_foreground.xml')
    if os.path.exists(stale):
        os.remove(stale)
        print('  removed Capacitor placeholder drawable-v24/ic_launcher_foreground.xml')


def android_splash():
    if not os.path.isdir(ANDROID):
        return
    for name, w, h in SPLASH:
        mark_px = max(48, int(min(w, h) * 0.34))
        mark = render.render(mark_px, 2, mask='none', ground=False)
        for orient, ow, oh in (('port', w, h), ('land', h, w)):
            d = os.path.join(ANDROID, 'drawable-%s-%s' % (orient, name))
            os.makedirs(d, exist_ok=True)
            render.write_png(os.path.join(d, 'splash.png'), ow, oh,
                             render.splash(ow, oh, mark_px, mark))
        print('  splash %-8s %dx%d and %dx%d' % (name, w, h, h, w))
    # the density-less fallback
    mark_px = 240
    mark = render.render(mark_px, 2, mask='none', ground=False)
    render.write_png(os.path.join(ANDROID, 'drawable', 'splash.png'), 720, 1280,
                     render.splash(720, 1280, mark_px, mark))


def ios_assets():
    icon_dir = os.path.join(IOS, 'AppIcon.appiconset')
    if not os.path.isdir(icon_dir):
        print('  (no ios project — skipping)'); return
    # No alpha channel: App Store Connect rejects icons that have one.
    render.write_png(os.path.join(icon_dir, 'AppIcon-512@2x.png'), 1024, 1024,
                     render.render(1024, 2, mask='none'), alpha=False)
    print('  AppIcon-512@2x.png  1024x1024, no alpha')

    splash_dir = os.path.join(IOS, 'Splash.imageset')
    if os.path.isdir(splash_dir):
        mark_px = 620
        mark = render.render(mark_px, 2, mask='none', ground=False)
        art = render.splash(2732, 2732, mark_px, mark)
        for name in ('splash-2732x2732.png', 'splash-2732x2732-1.png',
                     'splash-2732x2732-2.png'):
            render.write_png(os.path.join(splash_dir, name), 2732, 2732, art)
        print('  Splash.imageset     2732x2732 x3')


if __name__ == '__main__':
    print('Android icons:');  android_icons()
    print('Android splash:'); android_splash()
    print('iOS assets:');     ios_assets()
    print('done.')

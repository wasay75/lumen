#!/usr/bin/env python3
"""Copy the game into www/ — the folder Capacitor wraps for iOS and Android.

  python3 tools/package-www.py
"""
import os, shutil, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WWW = os.path.join(ROOT, 'www')
ITEMS = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'icons']

if os.path.isdir(WWW):
    shutil.rmtree(WWW)
os.makedirs(WWW)

for item in ITEMS:
    src = os.path.join(ROOT, item)
    dst = os.path.join(WWW, item)
    if os.path.isdir(src):
        shutil.copytree(src, dst)
    else:
        shutil.copy2(src, dst)

# Stamp the cache name so a redeploy invalidates the old offline copy.
version = time.strftime('%Y%m%d%H%M%S')
sw = os.path.join(WWW, 'sw.js')
with open(sw) as f:
    body = f.read()
with open(sw, 'w') as f:
    f.write(body.replace("var CACHE = 'lumen-v1';", "var CACHE = 'lumen-%s';" % version))

total = sum(os.path.getsize(os.path.join(r, f))
            for r, _, fs in os.walk(WWW) for f in fs)
print('packaged www/  (%d files, %.0f KB, cache lumen-%s)' %
      (sum(len(fs) for _, _, fs in os.walk(WWW)), total / 1024.0, version))

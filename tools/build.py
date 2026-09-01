#!/usr/bin/env python3
"""Inline every asset into one self-contained HTML file.

  python3 tools/build.py

Produces dist/lumen.html — no network, no relative paths, no service worker
needed. That single file is what you drop into a Capacitor/WebView shell, or
open straight from a phone to play-test.
"""
import base64, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')


def read(*parts):
    with open(os.path.join(ROOT, *parts), 'r', encoding='utf-8') as f:
        return f.read()


def data_uri(rel, mime):
    with open(os.path.join(ROOT, rel), 'rb') as f:
        return 'data:%s;base64,%s' % (mime, base64.b64encode(f.read()).decode())


def build():
    html = read('index.html')

    # 1. stylesheet -> <style>
    css = read('css', 'styles.css')
    html = re.sub(r'\s*<link rel="stylesheet"[^>]*>',
                  '\n<style>\n' + css + '\n</style>', html, count=1)

    # 2. scripts -> inline, in order.  install.js is skipped: it exists to
    #    register the service worker and drive the browser's install prompt,
    #    neither of which means anything in a single self-contained file.
    scripts = [s for s in re.findall(r'<script src="([^"]+)"></script>', html)
               if s != 'js/install.js']
    bundle = '\n'.join('/* ---- %s ---- */\n%s' % (s, read(*s.split('/'))) for s in scripts)
    html = re.sub(r'<script src="[^"]+"></script>\s*', '', html)
    html = html.replace('</body>', '<script>\n' + bundle + '\n</script>\n</body>')

    # 3. icons + manifest -> data URIs so the file stands alone
    html = html.replace('href="icons/icon.svg"', 'href="%s"' % data_uri('icons/icon.svg', 'image/svg+xml'))
    html = html.replace('href="icons/icon-180.png"', 'href="%s"' % data_uri('icons/icon-180.png', 'image/png'))
    html = re.sub(r'\s*<link rel="manifest"[^>]*>', '', html)

    os.makedirs(DIST, exist_ok=True)
    out = os.path.join(DIST, 'lumen.html')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(html)
    print('built %s  (%.0f KB)' % (out, os.path.getsize(out) / 1024.0))
    return out


def build_artifact():
    """A body fragment for publishing as an Artifact: the host supplies the
    document skeleton, so emit only <title>, <style>, the screens and <script>."""
    full = build()
    with open(full, 'r', encoding='utf-8') as f:
        html = f.read()

    title = re.search(r'<title>.*?</title>', html, re.S).group(0)
    style = re.search(r'<style>.*?</style>', html, re.S).group(0)
    body = re.search(r'<body>(.*?)</body>', html, re.S).group(1)

    out = os.path.join(DIST, 'lumen.artifact.html')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(title + '\n' + style + '\n' + body.strip() + '\n')
    print('built %s  (%.0f KB)' % (out, os.path.getsize(out) / 1024.0))
    return out


if __name__ == '__main__':
    if '--artifact' in sys.argv:
        build_artifact()
    else:
        build()

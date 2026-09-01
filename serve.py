#!/usr/bin/env python3
"""Tiny static server for local play-testing:  python3 serve.py [port]"""
import os, sys, functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5180


class Handler(SimpleHTTPRequestHandler):
    extensions_map = dict(SimpleHTTPRequestHandler.extensions_map)
    extensions_map['.webmanifest'] = 'application/manifest+json'

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


if __name__ == '__main__':
    print('Lumen serving %s on http://localhost:%d' % (ROOT, PORT), flush=True)
    ThreadingHTTPServer(('0.0.0.0', PORT), functools.partial(Handler, directory=ROOT)).serve_forever()

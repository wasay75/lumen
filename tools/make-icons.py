#!/usr/bin/env python3
"""Render Lumen's app icon to PNG at the sizes the stores ask for.
Pure stdlib -- no Pillow, no network, no build step."""
import math, struct, zlib, os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')

GOLD     = (232, 194, 122)
GOLD_HI  = (255, 240, 207)
WIRE     = (74, 79, 96)
BG_IN    = (24, 27, 36)
BG_OUT   = (8, 9, 12)


def lerp(a, b, t):
    return (round(a[0] + (b[0] - a[0]) * t),
            round(a[1] + (b[1] - a[1]) * t),
            round(a[2] + (b[2] - a[2]) * t))


def dist_seg(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    wx, wy = px - ax, py - ay
    L = vx * vx + vy * vy
    t = 0.0 if L == 0 else max(0.0, min(1.0, (wx * vx + wy * vy) / L))
    return math.hypot(px - (ax + t * vx), py - (ay + t * vy))


def render(size, ss, rounded=True):
    """A fragment of the weave: one quiet strand, one lit elbow ending in a node."""
    n = size * ss
    buf = bytearray(n * n * 4)
    half   = n * 0.045          # half stroke width
    corner = n * 0.219
    node   = (n * 0.50, n * 0.30, n * 0.088)

    grey_segs = [(0.775, 0.175, 0.775, 0.825)]
    gold_segs = [(0.135, 0.660, 0.500, 0.660), (0.500, 0.660, 0.500, 0.300)]
    grey_segs = [tuple(v * n for v in s) for s in grey_segs]
    gold_segs = [tuple(v * n for v in s) for s in gold_segs]

    hypot = math.hypot
    for y in range(n):
        fy = y + 0.5
        row = y * n * 4
        cy_lo, cy_hi = corner - fy, fy - (n - corner)
        dyy = cy_lo if cy_lo > 0 else (cy_hi if cy_hi > 0 else 0.0)
        for x in range(n):
            fx = x + 0.5
            i = row + x * 4
            if rounded and dyy:
                ax, bx = corner - fx, fx - (n - corner)
                dx = ax if ax > 0 else (bx if bx > 0 else 0.0)
                if dx and hypot(dx, dyy) > corner:
                    continue

            col = lerp(BG_IN, BG_OUT, min(1.0, hypot(fx - n / 2.0, fy - n * 0.34) / (n * 0.78)))
            for s in grey_segs:
                if dist_seg(fx, fy, *s) <= half:
                    col = WIRE; break
            for s in gold_segs:
                if dist_seg(fx, fy, *s) <= half:
                    col = GOLD; break
            if hypot(fx - node[0], fy - node[1]) <= node[2]:
                col = GOLD_HI

            buf[i] = col[0]; buf[i+1] = col[1]; buf[i+2] = col[2]; buf[i+3] = 255

    if ss == 1:
        return buf
    out = bytearray(size * size * 4)
    m = ss * ss
    for y in range(size):
        for x in range(size):
            r = g = b = a = 0
            for sy in range(ss):
                base = ((y * ss + sy) * n + x * ss) * 4
                for sx in range(ss):
                    j = base + sx * 4
                    r += buf[j]; g += buf[j+1]; b += buf[j+2]; a += buf[j+3]
            k = (y * size + x) * 4
            out[k] = r // m; out[k+1] = g // m; out[k+2] = b // m; out[k+3] = a // m
    return out


def write_png(path, size, rgba):
    raw = b''.join(b'\x00' + bytes(rgba[y*size*4:(y+1)*size*4]) for y in range(size))

    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data +
                struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff))

    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n'
                + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
                + chunk(b'IDAT', zlib.compress(raw, 9))
                + chunk(b'IEND', b''))


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    jobs = [(180, 3, True, 'icon-180.png'),
            (192, 3, True, 'icon-192.png'),
            (512, 2, True, 'icon-512.png'),
            (1024, 2, False, 'icon-1024.png')]
    for size, ss, rounded, name in jobs:
        write_png(os.path.join(OUT, name), size, render(size, ss, rounded))
        print('wrote', name)

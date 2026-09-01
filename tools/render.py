"""Lumen's mark, rendered to pixels. Pure stdlib — no Pillow anywhere in this
project, so icon generation works on a clean machine with nothing installed."""
import math, struct, zlib

GOLD    = (232, 194, 122)
GOLD_HI = (255, 240, 207)
WIRE    = (74, 79, 96)
BG_IN   = (24, 27, 36)
BG_OUT  = (8, 9, 12)
BG_FLAT = (10, 11, 14)


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


# The mark, in units of the full canvas: one quiet strand, one lit elbow
# ending in a node.  `scale` shrinks it toward the centre, which is how the
# Android adaptive-icon safe zone is respected.
GREY = [(0.775, 0.175, 0.775, 0.825)]
GOLDS = [(0.135, 0.660, 0.500, 0.660), (0.500, 0.660, 0.500, 0.300)]
NODE = (0.500, 0.300, 0.088)
STROKE = 0.045


def render(size, ss=2, mask='squircle', ground=True, scale=1.0):
    """mask: 'squircle' | 'circle' | 'none'.  ground=False leaves it transparent."""
    n = size * ss
    buf = bytearray(n * n * 4)
    c = n / 2.0
    corner = n * 0.219
    hypot = math.hypot

    def place(v):
        return (v - 0.5) * scale * n + c

    grey = [(place(s[0]), place(s[1]), place(s[2]), place(s[3])) for s in GREY]
    gold = [(place(s[0]), place(s[1]), place(s[2]), place(s[3])) for s in GOLDS]
    node = (place(NODE[0]), place(NODE[1]), NODE[2] * scale * n)
    half = STROKE * scale * n

    for y in range(n):
        fy = y + 0.5
        row = y * n * 4
        cy_lo, cy_hi = corner - fy, fy - (n - corner)
        dyy = cy_lo if cy_lo > 0 else (cy_hi if cy_hi > 0 else 0.0)
        for x in range(n):
            fx = x + 0.5
            i = row + x * 4

            if mask == 'squircle' and dyy:
                ax, bx = corner - fx, fx - (n - corner)
                dx = ax if ax > 0 else (bx if bx > 0 else 0.0)
                if dx and hypot(dx, dyy) > corner:
                    continue
            elif mask == 'circle' and hypot(fx - c, fy - c) > c:
                continue

            col = None
            if ground:
                col = lerp(BG_IN, BG_OUT,
                           min(1.0, hypot(fx - c, fy - n * 0.34) / (n * 0.78)))

            for s in grey:
                if dist_seg(fx, fy, *s) <= half:
                    col = WIRE; break
            for s in gold:
                if dist_seg(fx, fy, *s) <= half:
                    col = GOLD; break
            if hypot(fx - node[0], fy - node[1]) <= node[2]:
                col = GOLD_HI

            if col is None:
                continue                      # transparent foreground
            buf[i] = col[0]; buf[i+1] = col[1]; buf[i+2] = col[2]; buf[i+3] = 255

    return buf if ss == 1 else downsample(buf, size, ss)


def downsample(buf, size, ss):
    n = size * ss
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


def splash(w, h, mark_px, mark_rgba):
    """A flat ground with the mark centred — fast enough for 2732x2732."""
    row = bytes(BG_FLAT + (255,)) * w
    buf = bytearray(row * h)
    ox, oy = (w - mark_px) // 2, (h - mark_px) // 2
    for y in range(mark_px):
        src = y * mark_px * 4
        dst = ((oy + y) * w + ox) * 4
        for x in range(mark_px):
            s = src + x * 4
            if mark_rgba[s + 3] == 0:
                continue
            d = dst + x * 4
            buf[d:d+4] = mark_rgba[s:s+4]
    return buf


def write_png(path, w, h, rgba, alpha=True):
    """alpha=False writes RGB — the App Store rejects icons with an alpha channel."""
    if alpha:
        raw = b''.join(b'\x00' + bytes(rgba[y*w*4:(y+1)*w*4]) for y in range(h))
        color_type = 6
    else:
        rows = []
        for y in range(h):
            line = bytearray()
            base = y * w * 4
            for x in range(w):
                j = base + x * 4
                line += rgba[j:j+3]
            rows.append(b'\x00' + bytes(line))
        raw = b''.join(rows)
        color_type = 2

    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data +
                struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff))

    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n'
                + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, color_type, 0, 0, 0))
                + chunk(b'IDAT', zlib.compress(raw, 9))
                + chunk(b'IEND', b''))

#!/usr/bin/env python3
"""
Renders the Premium moving-portrait clips: one seamless, silent, looping <cardId>.mp4 per card,
made from the card art in assets/cards/full with nothing but code (no third-party footage).

Each clip keeps the border and title still and brings the picture to life: the painting ripples
and breathes, a soft light drifts across it, highlights twinkle, and particles that match the
card's element float through it (embers for fire, bubbles for water, motes for air, gold dust for
earth).

    npm run render:portraits                 # all 78 cards
    npm run render:portraits -- major-17-star cups-01-ace

Needs python3 with numpy + Pillow, and ffmpeg on the PATH. Output goes to build/portraits/ (not
committed, not bundled): upload that folder to the host behind PORTRAIT_BASE_URL. The ids of the
rendered clips are written to data/portraits.json, which is what switches them on in the app.
"""
import json
import subprocess
import sys
import zlib
from multiprocessing import Pool
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "assets" / "cards" / "full"
OUT = ROOT / "build" / "portraits"

W, H = 540, 936  # same aspect as the card (300:520)
SS = 2  # the art is sampled from a 2x copy so the warp stays sharp
FPS = 24
SECONDS = 6
FRAMES = FPS * SECONDS
TAU = 2 * np.pi

# The picture inside the printed border; the title strip below it stays still.
BOX = (0.055, 0.03, 0.945, 0.86)  # left, top, right, bottom (fractions of the card)
FEATHER = 0.03

ELEMENTS = {
    # colour, how many, (dx, dy) whole loops per clip, size range in px
    "fire": {"rgb": (255, 128, 40), "n": 46, "drift": (0, -1), "size": (2.0, 4.6)},
    "water": {"rgb": (150, 215, 255), "n": 38, "drift": (0, -1), "size": (2.2, 5.0)},
    "air": {"rgb": (255, 255, 255), "n": 40, "drift": (1, 0), "size": (1.8, 4.2)},
    "earth": {"rgb": (232, 180, 60), "n": 42, "drift": (0, 1), "size": (1.8, 4.2)},
}

YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
U, V = XX / W, YY / H


def smooth(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0, 1)
    return t * t * (3 - 2 * t)


l, t_, r, b = BOX
MASK = (
    smooth(l, l + FEATHER, U)
    * smooth(r, r - FEATHER, U)
    * smooth(t_, t_ + FEATHER, V)
    * smooth(b, b - FEATHER, V)
).astype(np.float32)
CX, CY = (l + r) / 2 * W, (t_ + b) / 2 * H


def sample(src, x, y):
    """Bilinear lookup into src (h, w, 3 float32) at float pixel coordinates."""
    h, w = src.shape[:2]
    x = np.clip(x, 0, w - 1.001)
    y = np.clip(y, 0, h - 1.001)
    x0, y0 = x.astype(np.int32), y.astype(np.int32)
    fx, fy = (x - x0)[..., None], (y - y0)[..., None]
    top = src[y0, x0] * (1 - fx) + src[y0, x0 + 1] * fx
    bot = src[y0 + 1, x0] * (1 - fx) + src[y0 + 1, x0 + 1] * fx
    return top * (1 - fy) + bot * fy


def splat(frame, x, y, radius, rgb, alpha):
    """Adds a soft glowing dot."""
    rad = int(np.ceil(radius * 3))
    x0, x1 = max(int(x) - rad, 0), min(int(x) + rad + 1, W)
    y0, y1 = max(int(y) - rad, 0), min(int(y) + rad + 1, H)
    if x0 >= x1 or y0 >= y1:
        return
    d2 = (XX[y0:y1, x0:x1] - x) ** 2 + (YY[y0:y1, x0:x1] - y) ** 2
    glow = np.exp(-d2 / (2 * radius * radius)) * alpha * MASK[y0:y1, x0:x1]
    # Blend toward the colour (so it shows on pale paper) and add a little light (so it glows on dark).
    cover = np.clip(glow, 0, 1)[..., None] * 0.85
    colour = np.asarray(rgb, np.float32)
    frame[y0:y1, x0:x1] = frame[y0:y1, x0:x1] * (1 - cover) + colour * cover + glow[..., None] * colour * 0.25


def flare(frame, x, y, size, alpha):
    """A small four-point twinkle."""
    rad = int(size * 4)
    x0, x1 = max(int(x) - rad, 0), min(int(x) + rad + 1, W)
    y0, y1 = max(int(y) - rad, 0), min(int(y) + rad + 1, H)
    if x0 >= x1 or y0 >= y1:
        return
    dx, dy = np.abs(XX[y0:y1, x0:x1] - x), np.abs(YY[y0:y1, x0:x1] - y)
    core = np.exp(-(dx * dx + dy * dy) / (2 * (size * 0.45) ** 2))
    rays = np.exp(-dx / (size * 1.3)) * np.exp(-dy / (size * 0.16)) + np.exp(-dy / (size * 1.3)) * np.exp(
        -dx / (size * 0.16)
    )
    glow = (core + rays * 0.8) * alpha * MASK[y0:y1, x0:x1]
    frame[y0:y1, x0:x1] += glow[..., None] * np.asarray((255, 246, 214), np.float32)


def highlights(lum, rng, count=7):
    """Bright spots of the picture, kept apart from each other, for the twinkles to sit on."""
    score = lum * MASK + rng.random(lum.shape).astype(np.float32) * 0.04
    score[MASK < 0.95] = 0
    picks = []
    for _ in range(count):
        y, x = np.unravel_index(int(np.argmax(score)), score.shape)
        if score[y, x] <= 0:
            break
        picks.append((float(x), float(y)))
        score[(XX - x) ** 2 + (YY - y) ** 2 < (W * 0.2) ** 2] = 0
    return picks


def render(card):
    card_id, element = card
    rng = np.random.default_rng(zlib.crc32(card_id.encode()))  # same clip on every run
    art = Image.open(ART / f"{card_id}.webp").convert("RGB")
    src = np.asarray(art.resize((W * SS, H * SS), Image.LANCZOS), np.float32)
    small = np.asarray(art.resize((W, H), Image.LANCZOS), np.float32)
    lum = small @ np.array([0.299, 0.587, 0.114], np.float32) / 255

    # Ripple: a few slow waves, each moving a whole number of cycles per clip so the loop is seamless.
    waves = [
        (rng.uniform(0.6, 2.4) * rng.choice([-1, 1]), rng.uniform(0.6, 2.8) * rng.choice([-1, 1]),
         rng.uniform(0, TAU), int(rng.choice([-2, -1, 1, 2])), rng.uniform(0, TAU))
        for _ in range(6)
    ]
    style = ELEMENTS[element]
    dots = [
        {
            "x": rng.uniform(0, 1), "y": rng.uniform(0, 1), "size": rng.uniform(*style["size"]),
            "speed": int(rng.choice([1, 1, 2])), "sway": rng.uniform(0.008, 0.03),
            "sway_n": int(rng.choice([1, 2, 3])), "phase": rng.uniform(0, TAU),
            "blink_n": int(rng.choice([1, 2, 3])), "alpha": rng.uniform(0.35, 0.9),
        }
        for _ in range(style["n"])
    ]
    stars = [
        {"x": x, "y": y, "size": rng.uniform(4.5, 8), "n": int(rng.choice([1, 2, 3])), "phase": rng.uniform(0, TAU)}
        for x, y in highlights(lum, rng)
    ]
    light_angle = rng.uniform(-0.5, 0.5)

    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / f"{card_id}.mp4"
    ff = subprocess.Popen(
        ["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "29",
         "-profile:v", "high", "-level", "4.0", "-pix_fmt", "yuv420p", "-g", str(FPS * 2),
         "-movflags", "+faststart", str(target)],
        stdin=subprocess.PIPE,
    )
    for i in range(FRAMES):
        t = i / FRAMES
        dx = np.zeros((H, W), np.float32)
        dy = np.zeros((H, W), np.float32)
        for fx, fy, phase, n, phase2 in waves:
            arg = TAU * (fx * U + fy * V + n * t) + phase
            dx += np.sin(arg)
            dy += np.cos(arg + phase2)
        breath = 0.5 - 0.5 * np.cos(TAU * t)
        zoom = 0.014 * breath
        dx = (dx * 1.05 - (XX - CX) * zoom) * MASK
        dy = (dy * 1.05 - (YY - CY) * zoom) * MASK
        frame = sample(src, (XX + dx) * SS + 0.5, (YY + dy) * SS + 0.5)

        # A soft band of light that drifts across once per loop, and a gentle pulse of warmth.
        band = np.exp(-(((U - 0.5) + (V - 0.5) * light_angle - (t * 2.2 - 1.1)) ** 2) / 0.03)
        frame *= 1 + MASK[..., None] * (0.16 * band[..., None] + 0.035 * breath)
        frame += MASK[..., None] * breath * np.array([5, 3, 0], np.float32)

        ddx, ddy = style["drift"]
        for d in dots:
            sway = d["sway"] * np.sin(TAU * d["sway_n"] * t + d["phase"])
            px = (d["x"] + ddx * d["speed"] * t + (sway if ddy else 0)) % 1
            py = (d["y"] + ddy * d["speed"] * t + (0 if ddy else sway)) % 1
            blink = 0.55 + 0.45 * np.sin(TAU * d["blink_n"] * t + d["phase"] * 1.7)
            # Fade out at the wrap-around edge so dots never pop in or out.
            edge = (py if ddy else px)
            fade = min(1.0, edge / 0.08, (1 - edge) / 0.08)
            splat(frame, l * W + px * (r - l) * W, t_ * H + py * (b - t_) * H, d["size"],
                  style["rgb"], d["alpha"] * blink * fade)
        for s in stars:
            pulse = max(0.0, np.sin(TAU * s["n"] * t + s["phase"])) ** 3
            if pulse > 0.02:
                flare(frame, s["x"], s["y"], s["size"] * (0.7 + 0.3 * pulse), 0.85 * pulse)

        ff.stdin.write(np.clip(frame, 0, 255).astype(np.uint8).tobytes())
    ff.stdin.close()
    if ff.wait() != 0:
        raise RuntimeError(f"ffmpeg failed for {card_id}")
    return card_id, target.stat().st_size


def main():
    cards = [(c["id"], c["element"]) for c in json.loads((ROOT / "data" / "cards.json").read_text())]
    wanted = set(sys.argv[1:])
    unknown = wanted - {c[0] for c in cards}
    if unknown:
        sys.exit(f"Unknown card id(s): {', '.join(sorted(unknown))}")
    todo = [c for c in cards if not wanted or c[0] in wanted]
    total = 0
    with Pool() as pool:
        for n, (card_id, size) in enumerate(pool.imap_unordered(render, todo), 1):
            total += size
            print(f"[{n}/{len(todo)}] {card_id}.mp4  {size / 1024:.0f} KB", flush=True)
    done = sorted(p.stem for p in OUT.glob("*.mp4"))
    order = [c[0] for c in cards if c[0] in done]
    (ROOT / "data" / "portraits.json").write_text(json.dumps(order, indent=2) + "\n")
    print(f"{len(todo)} clip(s), {total / 1e6:.1f} MB → {OUT.relative_to(ROOT)}; data/portraits.json lists {len(order)}")


if __name__ == "__main__":
    main()

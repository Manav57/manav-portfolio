FRAME SEQUENCE — how the canvas scroll engine works
════════════════════════════════════════════════════════════

Drop a numbered JPG sequence into this folder and the site will play it
as a scroll-driven 3D video background. Without any frames here, the
engine automatically renders a procedural 3D neon-galaxy flythrough
instead, so the site is always alive.

FORMATS (either works)

  1. Auto-detected sequence:
     frame_0001.jpg, frame_0002.jpg, frame_0003.jpg ... frame_1200.jpg
     (4-digit zero padding, sequential integers, .jpg or .jpeg)

  2. Manifest (any filenames, custom order):
     frames/manifest.json
     { "frames": ["myShot_001.jpg", "myShot_002.jpg", "..."] }

EXTRACT FROM VIDEO (quick way to make a sequence)

  ffmpeg -i your_video.mp4 -vf "scale=1280:-2,fps=24" -q:v 2 \
         frames/frame_%04d.jpg

  or run the helper:

  bash tools/extract-frames.sh your_video.mp4

TIPS
  • Keep total frames ≤ ~1200 and ~1280px wide — the browser has to
    decode each one; smaller frames = smoother scrubbing.
  • 120–300 frames at 24fps already feels buttery smooth when scrubbed.
  • After adding frames, hard-refresh (Ctrl+Shift+R) — the engine caches
    nothing but browsers will.

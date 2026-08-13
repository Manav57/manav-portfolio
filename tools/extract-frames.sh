#!/usr/bin/env bash
# Convert a video into a JPG frame sequence for the canvas scroll engine.
# Usage: bash tools/extract-frames.sh path/to/video.mp4 [width] [fps]
set -euo pipefail

VIDEO="${1:?usage: extract-frames.sh <video> [width] [fps]}"
WIDTH="${2:-1280}"
FPS="${3:-24}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/frames"

mkdir -p "$OUT"
echo "→ Extracting ${FPS}fps @ ${WIDTH}px into $OUT ..."
ffmpeg -y -i "$VIDEO" -vf "scale=${WIDTH}:-2,fps=${FPS}" -q:v 2 "$OUT/frame_%04d.jpg"
echo "✓ Done. Frame count:"
ls "$OUT"/frame_*.jpg | wc -l

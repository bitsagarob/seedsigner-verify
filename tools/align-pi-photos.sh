#!/bin/sh
# Build hw/pi-zero-v13.jpg and hw/pi-zero-w.jpg from two Wikimedia Commons photos.
#
#   Raspberry_Pi_Zero_1.3.jpg  by Horst-Josef, CC BY-SA 4.0
#     https://commons.wikimedia.org/wiki/File:Raspberry_Pi_Zero_1.3.jpg
#   Raspberry_Pi_Zero_WH.jpg   by the Raspberry Pi Foundation, CC BY-SA 4.0
#     https://commons.wikimedia.org/wiki/File:Raspberry_Pi_Zero_WH.jpg
#
# Both photos are warped into the same frame: the 65 x 30 mm board at 64 px/mm.
# The four mounting holes sit 3.5 mm in from each edge on every Pi Zero, so the
# centre of each hole's pad ring was picked by hand in each photo and the board
# corners below are extrapolated from those four points:
#
#   v1.3 hole centres (px): 706,702  3657,706  682,1868  3660,1872
#   W    hole centres (px): 486,540  4431,542  438,1910  4488,1913
#
# The W photo is taken at a slant, so tall parts (connectors, header pins) lean
# a little in the result. Flat parts line up to within a fraction of a millimetre.
# The output is CC BY-SA 4.0 like its sources. Byte-identical output needs the
# same ffmpeg build; the hole numbers above are the part worth checking.
set -eu
cd "$(dirname "$0")/.."
T=$(mktemp -d)
curl -sfL -A seedsigner-verify -o "$T/v13.jpg" https://upload.wikimedia.org/wikipedia/commons/3/3d/Raspberry_Pi_Zero_1.3.jpg
curl -sfL -A seedsigner-verify -o "$T/w.jpg" https://upload.wikimedia.org/wikipedia/commons/5/56/Raspberry_Pi_Zero_WH.jpg
ffmpeg -loglevel error -y -i "$T/v13.jpg" -map_metadata -1 -vf \
  "perspective=531.8:526.2:3834.4:530.7:498.3:2047.1:3840.4:2051.5:sense=source:interpolation=cubic,scale=4160:1920:flags=lanczos" \
  -q:v 3 hw/pi-zero-v13.jpg
ffmpeg -loglevel error -y -i "$T/w.jpg" -map_metadata -1 -vf \
  "perspective=256.1:337.6:4659.9:339.7:185.3:2124.7:4742.5:2128.2:sense=source:interpolation=cubic,scale=4160:1920:flags=lanczos" \
  -q:v 3 hw/pi-zero-w.jpg
rm -r "$T"
echo "wrote hw/pi-zero-v13.jpg and hw/pi-zero-w.jpg"

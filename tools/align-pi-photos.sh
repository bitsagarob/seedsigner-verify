#!/bin/sh
# Build hw/pi-zero-v13.jpg and hw/pi-zero-w.jpg from two Wikimedia Commons photos.
#
#   Raspberry_Pi_Zero_1.3.jpg  by Horst-Josef, CC BY-SA 4.0
#     https://commons.wikimedia.org/wiki/File:Raspberry_Pi_Zero_1.3.jpg
#   Raspberry_Pi_Zero_WH.jpg   by the Raspberry Pi Foundation, CC BY-SA 4.0
#     https://commons.wikimedia.org/wiki/File:Raspberry_Pi_Zero_WH.jpg
#   Raspberry_Pi_Zero_W_vs_Zero_(backside).jpeg  by Ubahnverleih, CC BY-SA 4.0
#     https://commons.wikimedia.org/wiki/File:Raspberry_Pi_Zero_W_vs_Zero_(backside).jpeg
#     (both backs in one photo; each board is cut out and flattened separately)
#
# Both photos are warped into the same frame: the 65 x 30 mm board at 64 px/mm.
# The four mounting holes sit 3.5 mm in from each edge on every Pi Zero, so the
# centre of each hole's pad ring was picked by hand in each photo and the board
# corners below are extrapolated from those four points:
#
#   v1.3 hole centres (px): 706,702  3657,706  682,1868  3660,1872
#   W    hole centres (px): 486,540  4431,542  438,1910  4488,1913
#   back, v1.3 (px):        1264,1128  2639,662  1529,1767  2978,1182
#   back, W (px):           131,570  1505,218  269,1088  1711,656
#
# The backs are shown as you see them after flipping the board over sideways,
# GPIO still at the top, at 32 px/mm because the source photo has fewer pixels.
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
curl -sfL -A seedsigner-verify -o "$T/back.jpg" "https://upload.wikimedia.org/wikipedia/commons/8/8c/Raspberry_Pi_Zero_W_vs_Zero_%28backside%29.jpeg"
ffmpeg -loglevel error -y -i "$T/back.jpg" -map_metadata -1 -vf \
  "perspective=1133.4:1071.0:2663.8:565.6:1471.3:1916.9:3110.4:1236.8:sense=source:interpolation=cubic,scale=2080:960:flags=lanczos" \
  -q:v 3 hw/pi-zero-v13-back.jpg
ffmpeg -loglevel error -y -i "$T/back.jpg" -map_metadata -1 -vf \
  "perspective=18.8:520.1:1548.9:137.4:191.9:1203.7:1821.7:703.7:sense=source:interpolation=cubic,scale=2080:960:flags=lanczos" \
  -q:v 3 hw/pi-zero-w-back.jpg
rm -r "$T"
echo "wrote hw/pi-zero-v13.jpg, hw/pi-zero-w.jpg and the two -back.jpg files"

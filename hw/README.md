# Hardware reference images

The photos and the Plus drawings are NOT covered by the repository's MIT licence. Each keeps the licence of
its source.

| File | Source | Author | Licence |
|---|---|---|---|
| `pi-zero-v13.jpg` | [File:Raspberry_Pi_Zero_1.3.jpg](https://commons.wikimedia.org/wiki/File:Raspberry_Pi_Zero_1.3.jpg), Wikimedia Commons | Horst-Josef | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `pi-zero-w.jpg` | [File:Raspberry_Pi_Zero_WH.jpg](https://commons.wikimedia.org/wiki/File:Raspberry_Pi_Zero_WH.jpg), Wikimedia Commons | Raspberry Pi Foundation | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `pi-zero-v13-back.jpg`, `pi-zero-w-back.jpg` | [File:Raspberry_Pi_Zero_W_vs_Zero_(backside).jpeg](https://commons.wikimedia.org/wiki/File:Raspberry_Pi_Zero_W_vs_Zero_(backside).jpeg), Wikimedia Commons | Ubahnverleih | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `plus-hat-front.svg` | Gerber files in [3rdIteration/seedsigner-hardware](https://github.com/3rdIteration/seedsigner-hardware/tree/7e4f05816bac9b20943996b960d65f37322d617e/display_hats/plus_hat/designspark_format) at commit `7e4f058` | MadBo (board design) | [CERN-OHL-S v2](https://ohwr.org/cern_ohl_s_v2.txt) |
| `plus-hat-back.svg` | same | same | same |
| `waveshare-front.svg`, `waveshare-back.svg` | our redrawing of Waveshare's product photos: front from their [Amazon listing](https://www.amazon.com/dp/B07FJQ4F2C), back from their [product page](https://www.waveshare.com/1.3inch-lcd-hat.htm) | Bitsaga, from photos by Waveshare | our own work in it is MIT; any rights in the photos stay with Waveshare |

Changes made:

- The photos are cropped and perspective-warped onto one 65 x 30 mm frame, so they line up
  for the slider on the page. `../tools/align-pi-photos.sh` does it and holds the hole
  coordinates it uses.
- The two SVGs are rendered from the Gerbers with `pcb-stackup@4` by
  `../tools/render-plus-hat.mjs`. The output is byte-reproducible; the hashes are in
  `../signatures/manifest.txt` and section 12 of `../VERIFICATION_LOG.md`.

- The two Waveshare drawings are made by `../tools/trace-waveshare.mjs`: each photo is flattened
  on its mounting holes, flat features (copper outlines, white print, the soldered ribbon, pads)
  are traced with potrace, and the tall parts are drawn to measured size. No photo pixels are
  served.

The part marks drawn on top of these images on the page live in `../hardware.js` and are MIT
like the rest of the repository.

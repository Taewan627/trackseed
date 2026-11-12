"""UI figure (Fig. 2 of the manuscript, software commit 0441abe). Input: the single screenshot made by fig_ui_screenshots.mjs
(argv[1] = directory with ui_v120_0441abe_seed42_validation.png, 2580 x 2166 px = 860 x 722 CSS px at device scale 3).
Output: paper/figures/fig_ui.png (6.5 in wide). Panel (a) is the whole screenshot, uncropped and only scaled down.
Panels (b) and (c) are magnified crops of the same screenshot (left column: header and sidebar title; Validation panel with its
ten checks); their source regions are outlined in (a). Nothing is retouched; the only drawing is the outlines and the panel labels.
With the repository as the working directory: python3 paper/scripts/fig_ui_compose.py /tmp/uishots"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import FIG, style
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from PIL import Image
src = os.path.join(sys.argv[1], 'ui_v120_0441abe_seed42_validation.png')
im = Image.open(src).convert('RGB')
S = 3                                  # device scale factor of the capture
assert im.size == (860 * S, 722 * S), im.size
W_CSS, H_CSS = 860, 722
SIDE = 251                              # sidebar width in CSS px (the border lies at x = 251.5)
REG_B = (0, 0, SIDE, 168)               # brand, version, sidebar title
REG_C = (0, 236, SIDE, 480)             # Validation panel: badge, counts, ten checks (validator v1.3)
def crop(r): return im.crop(tuple(v * S for v in r))
style(); plt.rcParams['savefig.bbox'] = 'standard'
FW = 6.5
PT = 1 / 72
sa = 0.345                               # pt per CSS px in panel (a)
sb = 0.575                               # pt per CSS px in panels (b), (c)
wa, ha = W_CSS * sa * PT, H_CSS * sa * PT
wb = SIDE * sb * PT
x0 = 0.02
FH = max(H_CSS * sa * PT, (REG_B[3]-REG_B[1]) * sb * PT + (REG_C[3]-REG_C[1]) * sb * PT + 0.30) + 0.20 + 0.03
top = FH - 0.20
fig = plt.figure(figsize=(FW, FH))
ax = fig.add_axes([x0 / FW, (top - ha) / FH, wa / FW, ha / FH]); ax.imshow(im); ax.axis('off')
for r, lab in ((REG_B, 'b'), (REG_C, 'c')):
    ax.add_patch(Rectangle((r[0] * S, r[1] * S), (r[2] - r[0]) * S, (r[3] - r[1]) * S, fill=False, ec='#E69F00', lw=0.9))
    ax.text(r[2] * S + 12, r[1] * S + 6, lab, color='#E69F00', fontsize=7.5, va='top', fontweight='bold')
fig.text(x0 / FW, (top + 0.06) / FH, '(a) Whole browser window (860 x 722 CSS px), not cropped', fontsize=7.5, va='bottom', ha='left')
xb = x0 + wa + 0.12
hb = (REG_B[3] - REG_B[1]) * sb * PT; hc = (REG_C[3] - REG_C[1]) * sb * PT
axb = fig.add_axes([xb / FW, (top - hb) / FH, wb / FW, hb / FH]); axb.imshow(crop(REG_B)); axb.axis('off')
yc = top - hb - 0.30
axc = fig.add_axes([xb / FW, (yc - hc) / FH, wb / FW, hc / FH]); axc.imshow(crop(REG_C)); axc.axis('off')
fig.text(xb / FW, (top + 0.06) / FH, '(b) magnified, from (a)', fontsize=7.5, va='bottom', ha='left')
fig.text(xb / FW, (yc + 0.05) / FH, '(c) magnified, from (a)', fontsize=7.5, va='bottom', ha='left')
for a in (axb, axc):
    for s in a.spines.values(): s.set_visible(True); s.set_edgecolor('#E69F00'); s.set_linewidth(0.9)
out = os.path.join(FIG, 'fig_ui.png')
fig.savefig(out, dpi=300, bbox_inches=None, pad_inches=0)
print('ui figure ok', Image.open(out).size, os.path.getsize(out), 'bytes')

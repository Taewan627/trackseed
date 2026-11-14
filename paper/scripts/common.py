"""Shared helpers for the TrackSeed paper scripts (figures and seed-clustered intervals).

Inputs are read with `git show <REV>:<path>` from the software repository, never from its working tree.
  TLSX_REPO  software repository; default: the repository containing paper/scripts/ (the repository root),
             else /home/claude/tlsx (the paper workspace, where the scripts are used from outside the repository)
  TLSX_REV   commit to read the experiment results from; default 0441abe (TrackSeed v1.2.0 release candidate);
             since experiments/e6 to e9 are unchanged after that commit
  TLSX_OUT   output root; figures go to $TLSX_OUT/figures, data to $TLSX_OUT/data; default: the paper/ folder next to scripts/
"""
import os, math
_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.abspath(os.path.join(_HERE, '..', '..'))
REPO = os.environ.get('TLSX_REPO') or (_ROOT if os.path.exists(os.path.join(_ROOT, 'src', 'core.ts')) else '/home/claude/tlsx')
REV = os.environ.get('TLSX_REV', '23b6bb9')   # 0441abe before the trailer edit (docs/commit-map.txt)
OUT = os.environ.get('TLSX_OUT') or os.path.abspath(os.path.join(_HERE, '..'))
FIG = os.path.join(OUT, 'figures'); DATA = os.path.join(OUT, 'data')
os.makedirs(FIG, exist_ok=True); os.makedirs(DATA, exist_ok=True)

# Okabe-Ito colour-blind-safe palette
OI = dict(black='#000000', orange='#E69F00', sky='#56B4E9', green='#009E73',
          yellow='#F0E442', blue='#0072B2', verm='#D55E00', purple='#CC79A7')
INK = '#222222'
GRID = '#D9D9D9'

def wilson(k, n, z=1.959964):
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return c - h, c + h

def style():
    import matplotlib as mpl
    mpl.rcParams.update({
        'font.family': 'DejaVu Sans', 'font.size': 8, 'axes.titlesize': 8.5,
        'axes.labelsize': 8, 'xtick.labelsize': 7.5, 'ytick.labelsize': 7.5,
        'legend.fontsize': 7.5, 'axes.edgecolor': '#555555', 'axes.linewidth': 0.7,
        'axes.spines.top': False, 'axes.spines.right': False,
        'text.color': INK, 'axes.labelcolor': INK, 'xtick.color': INK, 'ytick.color': INK,
        'figure.dpi': 100, 'savefig.dpi': 300, 'savefig.bbox': 'tight', 'savefig.pad_inches': 0.04,
    })

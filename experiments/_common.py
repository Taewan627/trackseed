"""Shared helpers for the E2-E4 analysis and figure scripts (numpy/pandas only)."""
import math, os
import numpy as np, pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
Z = 1.959964
METRICS = ['sampleCount', 'length', 'boundingBoxArea', 'straightLengthFraction', 'meanAbsCurvature', 'maxAbsCurvature', 'p95AbsCurvature',
           'curvatureEntropyBits', 'turnCount', 'elevationRange', 'maxAbsSlope', 'meanAbsSlope', 'totalTurningDegrees']
MODES = ['auto', 'right-angle', 'hairpin', 's-curve']
# (x metric, y metric) of the three expressive-range pairs (E3 PROTOCOL.md)
PAIRS = [('straightLengthFraction', 'curvatureEntropyBits'), ('totalTurningDegrees', 'length'), ('elevationRange', 'maxAbsSlope')]
BINS = 30
# Warnings never make a track invalid; every other code is an error-severity code.
WARNING_CODES = {'MIN_TURN_RADIUS', 'MAX_SLOPE'}

def wilson(k, n):
    if n == 0: return (float('nan'),) * 3
    p = k / n; d = 1 + Z * Z / n
    c = (p + Z * Z / (2 * n)) / d; h = Z * math.sqrt(p * (1 - p) / n + Z * Z / (4 * n * n)) / d
    return (p, max(0.0, c - h), min(1.0, c + h))

def pct(t): return f'{100 * t[0]:.2f}% [{100 * t[1]:.2f}, {100 * t[2]:.2f}]'

def load_e2():
    d = pd.read_csv(os.path.join(HERE, 'e2', 'results', 'validity.csv.gz'), keep_default_na=False, na_values=[''], low_memory=False)
    d['error'] = d['error'].fillna(''); d['codes'] = d['codes'].fillna('')
    return d

def load_e4_baselines():
    d = pd.read_csv(os.path.join(HERE, 'e4', 'results', 'baselines.csv.gz'), keep_default_na=False, na_values=[''], low_memory=False)
    d['error'] = d['error'].fillna(''); d['codes'] = d['codes'].fillna('')
    return d

def error_codes_noclosure(s):
    """Exploratory: error-severity codes other than CLOSURE_TANGENT in a ';'-joined code string."""
    return [c for c in s.split(';') if c and c not in WARNING_CODES and c != 'CLOSURE_TANGENT']

def hist2d(xs, ys, xedges, yedges):
    return np.histogram2d(xs, ys, bins=[xedges, yedges])[0]

def hist_entropy_bits(h):
    p = h[h > 0] / h.sum()
    return float(-(p * np.log2(p)).sum())

def pair_edges(frames, xm, ym):
    """30 x 30 linear bins between the pooled min and max over all given frames."""
    xs = np.concatenate([f[xm].values for f in frames]); ys = np.concatenate([f[ym].values for f in frames])
    return np.linspace(xs.min(), xs.max(), BINS + 1), np.linspace(ys.min(), ys.max(), BINS + 1)

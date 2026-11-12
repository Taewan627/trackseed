"""Prints the per-source dry-run table (counts, points per track, spacing, width, units, failures) for build/polylines/ and the per-source
aggregate sha256 (sha256 over the sorted '<file>  <sha256>' lines). Usage: python3 -I summarize.py BUILD_DIR"""
import glob, hashlib, json, os, statistics as st, sys
build = sys.argv[1]
root = os.path.join(build, "polylines")
print(f"{'source':26s} {'unit':4s} {'tracks':>6s} {'fail':>5s} | {'pts min':>7s} {'median':>7s} {'max':>6s} | {'spacing(min/med/max of per-track medians)':>42s} | {'width min/med/max':>20s} | {'length min/med/max':>24s} | dropped-close")
allsums = []
for d in sorted(glob.glob(os.path.join(root, "*"))):
    if not os.path.isdir(d): continue
    name = os.path.basename(d)
    rows = [l.rstrip("\n").split("\t") for l in open(os.path.join(d, "manifest.tsv"))][1:]
    nf = len(open(os.path.join(d, "failures.tsv")).read().splitlines()) - 1
    n = [int(r[1]) for r in rows]; sp = [float(r[5]) for r in rows]; wd = [float(r[2]) for r in rows]; ln = [float(r[4]) for r in rows]
    dropped = sum(int(r[6]) for r in rows)
    unit = rows[0][3] if rows else "?"
    lines = []
    for f in sorted(glob.glob(os.path.join(d, "*.json"))):
        lines.append(f"{name}/{os.path.basename(f)}  {hashlib.sha256(open(f, 'rb').read()).hexdigest()}")
    allsums += lines
    agg = hashlib.sha256("\n".join(lines).encode()).hexdigest()
    print(f"{name:26s} {unit:4s} {len(rows):6d} {nf:5d} | {min(n):7d} {st.median(n):7.0f} {max(n):6d} | {min(sp):13.4g} {st.median(sp):13.4g} {max(sp):13.4g} | {min(wd):6.4g}/{st.median(wd):6.4g}/{max(wd):6.4g} | {min(ln):8.5g}/{st.median(ln):8.5g}/{max(ln):8.5g} | {dropped}   agg-sha256 {agg[:16]}")
open(os.path.join(root, "SHA256SUMS"), "w").write("\n".join(allsums) + "\n")

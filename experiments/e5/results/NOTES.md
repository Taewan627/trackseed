# E5 deviations and post-hoc items (hand-written; the generated numbers are in SUMMARY.md / SUMMARY.json)

Deviations from PROTOCOL.md (none changes the case set, the subject, the seeding method or a measured quantity):
1. Firefox, first attempt: `page.goto` hit Playwright's default 30 s timeout because the page's single module script runs the
   1000 cases synchronously before the load event. Fixed in run-browser.mjs (`waitUntil: 'commit'`, timeout 15 min) and Firefox re-run
   alone with the same page.html and bundle. Chrome's result is from the first full run-all.sh (it finished within 30 s; the same
   fix is now in the script for both browsers). Original error text: "page.goto: Timeout 30000ms exceeded".
2. Before the full multi-engine run I ran experiments/e5/run.mjs on Node 22 alone, and ran analyze.mjs on that single engine's data
   while debugging analyze.mjs. I therefore saw the Node 22 validity (Q2) and metric (Q3) numbers before the other engines ran; the
   Q2/Q3 predictions had already been committed and were not edited. Bugs fixed in analyze.mjs in that phase: the "n per group"
   printout, Q2e counted the largest single CLOSURE_* code instead of cases with any CLOSURE_* code (protocol wording), and the
   brute-force cross-check lacked the bounding-box rejection. make-figure.py had a format-string bug fixed after the first run-all.sh.
3. run-all.sh's analysis/figure steps were re-run by hand after the Firefox re-run (analysis twice, `cmp` of SUMMARY.md, SUMMARY.json,
   validity.jsonl: identical; see ANALYSIS_DETERMINISM.txt).

Prediction that FAILED: Q1c (Node 24 below 100%): Node 24 agreed with Node 22 on 1000/1000 seeds. All other predictions held
(table at the end of SUMMARY.md).

Post-hoc, not pre-registered:
- Brute-force centre-line crossing check inside analyze.mjs (independent O(n^2) segment test; same three seeds as the validator).
- probe-math.mjs / probe-math.jsonl: 200000 fixed inputs per function, SHA-256 of the result bits, Node 22/20/24, Deno 2.9.6, Bun 1.4.4
  (browsers not probed). sin, cos, acos, atan2 differ in Deno and Bun from Node 22/20/24; hypot differs in Bun only; sqrt identical.
  This attributes the output differences to the engines' Math functions, for those engines only.

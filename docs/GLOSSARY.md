# Glossary

Terms that appear in the experiment files under `experiments/` and in the older documentation. The experiment files are historical records and are not edited to match this glossary, so the same label can carry different meanings in different files; each entry says where the meaning comes from.

## Experiments and protocols

- **E1 to E8, E1b, E4 (experiment names).** One directory per experiment under `experiments/`. Where a `PROTOCOL.md` exists, it was committed before any result of that experiment (for example [experiments/e7/PROTOCOL.md](../experiments/e7/PROTOCOL.md)); the `SUMMARY` files report what was measured.
- **Pre-registration (protocol).** A document committed before the results it governs, fixing the question, the measures and the predictions. The numbered predictions (P1, P2, ...) are listed in each experiment's `SUMMARY` (for example [experiments/e7/SUMMARY.md](../experiments/e7/SUMMARY.md)).
- **Exploratory.** A measurement made to choose a value, not evaluated against a prediction. Example: the seeds 10000..10199 used to choose the default height ([experiments/e8/EXPLORATION.md](../experiments/e8/EXPLORATION.md)); the note in [experiments/e7/SUMMARY.md](../experiments/e7/SUMMARY.md) on its exploratory run.

## Seed sets

- **DEV.** The seeds used to develop a rule or a constant before a held-out evaluation. Example: DEV = `SEEDS[150..169]` in [experiments/e7/PROTOCOL.md](../experiments/e7/PROTOCOL.md).
- **HELD-OUT.** The seeds kept for one evaluation after the protocol is frozen. Example: HELD-OUT = `SEEDS[170..199]` in [experiments/e7/PROTOCOL.md](../experiments/e7/PROTOCOL.md); E8 uses `SEEDS[100..199]` and states that it was evaluated once ([experiments/e8/SUMMARY.md](../experiments/e8/SUMMARY.md)).

## Process documents

- **FREEZE.** A commit after which no change to the code or to the harness is allowed before the held-out run. Example: [experiments/e7/FREEZE.md](../experiments/e7/FREEZE.md).
- **ADDENDUM.** A pre-registration that extends an existing protocol to a new version or a new check, committed before the code or the results it covers exist. Examples: [experiments/e1/ADDENDUM-v1.1.0.md](../experiments/e1/ADDENDUM-v1.1.0.md), [experiments/amendment-01/ADDENDUM-E3.md](../experiments/amendment-01/ADDENDUM-E3.md).
- **AMENDMENT.** A pre-registered change to a validator check after results were reported. The earlier results stay reproducible under the old setting, and the change is reported separately. Example: [experiments/AMENDMENT-01.md](../experiments/AMENDMENT-01.md), which recalibrates the `CLOSURE_TANGENT` check.
- **Auditor.** An internal review step of the development workflow, carried out separately from the generation of a result. The committed files describe it only through the findings it produced: [experiments/AMENDMENT-01.md](../experiments/AMENDMENT-01.md) ("The auditor found ...") and [experiments/e6/PROTOCOL.md](../experiments/e6/PROTOCOL.md) ("reproduced by the auditor").

## Stage labels (S0 to S6)

No committed file defines the stage labels. The labels that appear in prose, and the sense in which each file uses them, are:

- **S1.** In [experiments/e1/results/v1.1.0/SUMMARY.md](../experiments/e1/results/v1.1.0/SUMMARY.md), the subject with the default join at 1.1.0 (S2 there is the legacy join).
- **S2.** In [experiments/AMENDMENT-01.md](../experiments/AMENDMENT-01.md), the version 0.5.0 validator check `CLOSURE_TANGENT`. In [experiments/e2/PROTOCOL.md](../experiments/e2/PROTOCOL.md) it names a 48-case run.
- **S3b.** In [experiments/AMENDMENT-01.md](../experiments/AMENDMENT-01.md), the original version 0.5.0 results. For E2 these are the results of commit 7f1c872 (version 0.5.0); for E1b the harness and results are at commit 6779f9b (version 0.5.0).
- **S3c.** In [experiments/AMENDMENT-01.md](../experiments/AMENDMENT-01.md), the title of that amendment: the recalibration of `CLOSURE_TANGENT`.
- **S0, S4, S5, S6.** The committed files use these letters only as variable names in scripts or as coefficient names, not as stage labels.

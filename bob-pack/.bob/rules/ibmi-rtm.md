# IBM i RTM rules (applies to every rtm-* mode)

## Traceability
- `rtm/rtm.json` is the source of truth. Documents in `docs/` are generated views of it plus narrative.
- Id prefixes: FR (functional requirement), IMP (impact item), ART (artifact), UT (unit test),
  QA (manual QA script), HQ (headless automated QA). Get the next id from `node .rtm/cli.js next-id <PREFIX>`.
- Ids are permanent. A removed requirement becomes `"status": "deferred"`, never deleted or renumbered.
- Every artifact traces to ≥1 FR. Every FR traces to ≥1 artifact, ≥1 unit test and ≥1 QA or headless test.
- Every `modify`/`delete` artifact in a brownfield project references the IMP item that justifies it.
- `node .rtm/cli.js validate` must report zero errors before a step is complete.
- Put trace ids in source: a header comment block listing the ART id and FR ids, and an end-of-line or
  block tag `// FR-012` on changed lines in modified source so diffs can be audited against the RTM.

## Environment safety
- Compile and create objects only in the project's development library (`project.library`).
  Never compile into, change, or delete objects in production libraries.
- Never run destructive commands (DLTF, DLTPGM, CLRPFM, DROP TABLE, RMVM, CHGPF on live data) without explicit
  confirmation, and never against non-development libraries.
- Changing a PF/table record format causes level checks: list every dependent program (DSPDBR, DSPPGMREF)
  as callers on the IMP item and plan their recompiles as artifacts.

## Coding standards
- RPGLE: `**free`, `ctl-opt` with `option(*srcstmt:*nodebugio)`, `dftactgrp(*no)` and an explicit `actgrp`.
  Qualified data structures, `dcl-pi`/`dcl-pr` prototypes, no `*INxx` logic (use named indicators via `INDARA`).
  Business logic in NOMAIN modules / service programs so it can be unit tested; DSPF programs stay thin.
- Embedded SQL: `exec sql set option commit = *none, closqlcsr = *endmod, datfmt = *iso`; check SQLSTATE
  after every statement.
- CLLE: `PGM`/`ENDPGM`, `MONMSG` on every command that can fail, no hard-coded library lists — use the job's
  library list or a JOBD.
- New tables: SQL DDL (`CREATE OR REPLACE TABLE … FOR SYSTEM NAME …`) with a primary key and audit columns.
  Keep existing DDS PFs as DDS unless the spec explicitly modernises them.
- Displays and printers: DDS DSPF/PRTF. Use `INDARA`, keep F3=Exit/F12=Cancel conventions, 24x80 unless the spec
  says 27x132. Document every record format, field and function key in the tech spec.
- Object names: max 10 characters, upper case, follow the project's existing naming prefix.

## Building
- Prefer the project's existing build tool: IBM i build tooling (`makei` / Rules.mk or iproj.json),
  Source Orbit, or compile commands via Code for IBM i actions. Fall back to CRTSQLRPGI / CRTBNDRPG /
  CRTRPGMOD / CRTSRVPGM / CRTBNDCL / CRTDSPF / RUNSQLSTM with `DBGVIEW(*SOURCE)`.
- Read the compile listing / spool on failure; fix and retry at most 3 times, then set status `failed` and stop.

## Testing
- Unit: RPGUnit test service programs (`T_*` procedures, assert built-ins) run with RUCALLTST; one test file
  per module under `qtestsrc/` or `tests/unit/`.
- QA manual: step tables (Step · Action · Data · Expected result) under `tests/qa/QA-nnn.md`.
- Headless automated: under `tests/headless/HQ-nnn.*`, runnable over SSH with no 5250 session:
  seed data (SQL), call the program non-interactively (`system "CALL PGM(…) PARM(…)"` or SQL `CALL`), assert
  Db2 state / spool / message queue with SQL (QSYS2 services). Screen-flow tests use the project's 5250
  automation driver if one is configured; otherwise document them as QA manual and flag the gap.

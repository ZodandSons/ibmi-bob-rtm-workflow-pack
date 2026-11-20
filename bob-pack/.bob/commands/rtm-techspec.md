---
description: Functional requirements (+ impact analysis) → executable technical specification and artifact/test plan
argument-hint: [FR ids | blank = all approved]
---
Write the technical specification for the approved requirements using
`rtm/templates/technical-specification.md`, output to `docs/techspec/technical-specification.md`.

Rules:
- Brownfield: start from `docs/analysis/impact-analysis.md`. Every change to an existing object is shown as a
  change callout — `> **[MOD] CUSTMNT · FR-004 · IMP-002**` — followed by *Current* and *Required* behaviour,
  the exact procedures/subroutines/record formats/fields affected, and a before/after snippet where it helps.
  New objects get `[NEW]`, removals `[DEL]`. Include a change summary table at the top.
- Be executable: a builder must be able to generate every artifact from this document alone.
  - SQL tables: full DDL (system name ≤10, columns, types, nullability, keys, constraints, indexes, labels).
  - PF/LF changes: the DDS lines added/changed, and the CHGPF/data conversion approach.
  - DSPF/PRTF: record formats, field table (name, type, length, row/col, usage, edit, validation),
    function keys, indicators via INDARA, 24x80 screen mock-up in a code block, message handling.
  - Programs: type (RPGLE/SQLRPGLE/CLLE/module/SRVPGM), parameters/PI, files and SQL used, procedure list with
    responsibilities, processing logic as numbered steps or pseudocode, error handling, commitment control,
    activation group, binding.
  - Build: object list in build order, compile commands/options, binding directories, library list, authorities.
- Tests are part of the spec:
  - **Unit tests** (UT): RPGUnit test procedures per module — inputs, expected outputs, setup/teardown.
  - **QA scripts** (QA): step tables with data and expected screen/report/DB results, including negative paths.
  - **Headless automated QA** (HQ): seed SQL, non-interactive call, SQL assertions, cleanup; and for screen flows,
    the 5250 automation steps if a driver is configured.
  - **Regression**: existing behaviour that must still work (brownfield).
- Plan in `rtm/rtm.json`: one `artifact` per object (ids from `next-id ART`, `path`, `action`, `reqIds`,
  `impactIds` for modify/delete, `dependsOn`, `specRef` = heading anchor, `status: planned`), including recompiles
  forced by level checks; one `test` per UT/QA/HQ with `reqIds`, `artifactIds`, `path`.
- Set `inputs.techSpec`. Run `node .rtm/cli.js validate` and iterate until **0 errors**. Then run
  `node .rtm/cli.js matrix --out docs/rtm.md` and summarise: objects new/modified, tests, open questions.

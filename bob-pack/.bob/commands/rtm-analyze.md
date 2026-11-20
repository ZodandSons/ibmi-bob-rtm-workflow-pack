---
description: Brownfield impact analysis — what existing IBM i objects must change for the approved requirements
argument-hint: [FR ids | blank = all approved]
---
Perform an impact analysis of the existing application for the approved requirements
(or only the FR ids given after the command). Read-only: do not change application source.

1. **Inventory** the source: every program, module, service program, CL, command, PF, LF, DSPF, PRTF,
   SQL object. Record type, member/path and a one-line purpose.
2. **Cross-reference**. From source: `dcl-f`/F-specs, `EXTNAME`/`LIKEREC`, embedded SQL table references,
   `CALL`/`CALLP`/`EXTPGM`/`EXTPROC`, `/copy`/`/include`, binding directories, CL `CALL`/`OVRDBF`/`SBMJOB`,
   LF `PFILE`, DSPF `REF`/`REFFLD`. If an IBM i connection is available (Code for IBM i / MCP / SQL), confirm with
   `DSPPGMREF ... OUTPUT(*OUTFILE)`, `DSPDBR`, `QSYS2.SYSTABLEDEP`, `QSYS2.OBJECT_STATISTICS` and state which
   facts came from the system vs from source.
3. **Locate each requirement**: which objects implement the behaviour today; what is missing.
4. **Impact items**: for every object that must change, add an `impact` entry (`node .rtm/cli.js next-id IMP`)
   with object, type, path, `change` (precise: which record format, field, subroutine/procedure, screen),
   `risk` (low/medium/high with reason), `reqIds`, `callers`, and `levelCheck: true` for any file format change.
   Include ripple effects: every program that must be recompiled because a file format changes, every caller of
   a changed parameter list, every LF over a changed PF, every DSPF that references a changed field.
5. Write `docs/analysis/impact-analysis.md`: inventory summary, call/file dependency graph (Mermaid),
   a requirement → current implementation table, the impact table (IMP · object · change · risk · FRs · callers),
   risks, data conversion needs, and regression test scope. Set `inputs.impactDoc`.
6. Run `node .rtm/cli.js validate` — `IMPACT_UNPLANNED` errors are expected until `/rtm-techspec` plans artifacts.

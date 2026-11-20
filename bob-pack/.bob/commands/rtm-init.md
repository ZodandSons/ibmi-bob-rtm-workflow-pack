---
description: Initialise RTM for this project (detects greenfield vs brownfield)
argument-hint: <project-name> <dev-library>
---
Initialise requirements traceability for this IBM i project.

1. If `rtm/rtm.json` exists, stop and summarise it instead (run `node .rtm/cli.js validate`).
2. Detect the project type: look for existing RPGLE/SQLRPGLE/CLLE/DDS source (`*.rpgle`, `*.sqlrpgle`,
   `*.clle`, `*.pf`, `*.lf`, `*.dspf`, `*.prtf`, `*.sql`, QRPGLESRC/QDDSSRC-style folders, iproj.json, Rules.mk).
   Any existing application source → `brownfield`, otherwise `greenfield`. Tell me what you found.
3. Use the project name and development library supplied after the command; ask for any that are missing.
   Refuse a library that looks like production (no DEV/TST marker) unless I confirm it.
4. Run `node .rtm/cli.js init <name> <LIBRARY> <greenfield|brownfield>`.
5. Create `docs/spec/`, `docs/requirements/`, `docs/analysis/`, `docs/techspec/`, `tests/unit/`, `tests/qa/`,
   `tests/headless/` if they do not exist.
6. Tell me the next step: `/rtm-requirements <path to product spec>`.

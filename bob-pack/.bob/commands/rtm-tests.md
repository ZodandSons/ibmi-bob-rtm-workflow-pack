---
description: Generate unit tests, QA scripts and headless automated QA from the technical specification
argument-hint: [test ids | blank = all without a file]
---
Generate the test assets planned in `rtm/rtm.json` (or only the ids given), exactly as specified in
`docs/techspec/technical-specification.md`.

- **UT-***: RPGUnit test source (`tests/unit/` or `qtestsrc/`), one test procedure per case, named `test_<behaviour>`,
  with setup/teardown that isolates data. Header comment lists UT id, FR ids, ART ids.
- **QA-***: `tests/qa/QA-nnn.md` — preconditions, test data, step table (Step · Action · Input · Expected),
  pass/fail column, FR ids.
- **HQ-***: `tests/headless/HQ-nnn.sql` + `HQ-nnn.sh` (or a single runner file per the project convention):
  seed → non-interactive call → assertions → cleanup, exit code 0/1, one line of output per assertion.
  Assertions query Db2 / QSYS2 services, never the screen.
- Add `tests/headless/run-all.sh` that runs every HQ script and prints `HQ-nnn PASS|FAIL detail`.
- Update each test's `path` in `rtm/rtm.json`. Run `node .rtm/cli.js validate`.

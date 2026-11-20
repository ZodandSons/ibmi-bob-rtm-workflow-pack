---
description: Run unit and headless tests, record results in the RTM, and report coverage
argument-hint: [test ids | blank = all]
---
Run the tests and record the results.

1. Unit: run each UT with RUCALLTST (or the project's test runner); parse pass/fail per test.
2. Headless: run `tests/headless/run-all.sh` (or each HQ script) over the configured IBM i connection.
3. Record every result: `node .rtm/cli.js set-status <TEST-id> pass|fail|blocked "<short detail>"`.
4. QA manual scripts are not executed by you: list them with their status for a human tester and remind me
   to record results the same way.
5. For each FR whose traced tests all pass, propose status `implemented` (unit+headless) or `verified`
   (all incl. QA); apply only after I confirm.
6. Run `node .rtm/cli.js validate` and `node .rtm/cli.js matrix --out docs/rtm.md`; summarise failures with the
   likely cause and the artifact to fix.

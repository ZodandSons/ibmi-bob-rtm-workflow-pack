---
description: Traceability status report — coverage, gaps and next actions
---
Run `node .rtm/cli.js validate` and `node .rtm/cli.js matrix --out docs/rtm.md`, then report:
- requirements by status, and how many are fully traced;
- every gap grouped by type (missing artifact, missing unit/QA/headless test, unplanned impact, failed build/test);
- artifacts by status; tests by result;
- the single most useful next command to run.
Keep it to one screen.

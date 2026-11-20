---
description: Apply a change request end-to-end with traceability (requirements → impact → spec delta)
argument-hint: <change request text or file>
---
Apply the change request given after the command.

1. Identify which existing FRs change, which are new, and which are withdrawn. Update in place (keep ids),
   add new FRs with new ids, set withdrawn ones to `deferred` — never delete. Record the change request text
   as the `source` of new/changed FRs.
2. Re-run the impact procedure (`/rtm-analyze`) for the affected FRs only and add/update IMP items.
3. Update the technical specification with a **Change log** entry and change callouts for the delta; add or
   update artifacts and tests in `rtm/rtm.json`. Reset `status` to `planned` for artifacts that must be rebuilt
   and clear `lastResult` of tests that must be rerun.
4. Validate to 0 errors and summarise the delta: FRs, objects, tests.

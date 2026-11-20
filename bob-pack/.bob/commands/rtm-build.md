---
description: Execute the technical specification — generate, compile and record every planned artifact
argument-hint: [ART ids | blank = all not yet built]
---
Execute the technical specification. Scope: the artifact ids given after the command, or every artifact whose
status is not `built`.

1. Run `node .rtm/cli.js validate`. If there are errors, stop and list them — the spec must be fixed first
   (`/rtm-techspec`). Confirm the target library is the development library in `project.library`.
2. Run `node .rtm/cli.js order` and process artifacts in that order. For each:
   a. Read its section in the tech spec (`specRef`), its FRs and, for modify, its IMP item and current source.
   b. `new`: create the source at `path`. `modify`: change only what the spec requires, tag changed lines with the
      FR id, keep existing style. `delete`: confirm with me first.
   c. Add/refresh the trace header (ART id, FR ids, generated date).
   d. `node .rtm/cli.js set-status <ART-id> generated`.
   e. Compile into the development library with the project's build tool (see rules). On failure read the listing,
      fix, retry up to 3 times; then `set-status <ART-id> failed` and stop the run with a clear report.
   f. On success `set-status <ART-id> built`.
3. If the tests are not generated yet, run the `/rtm-tests` procedure now.
4. Finish with `node .rtm/cli.js validate` and a table: artifact · action · status · compile notes.
   Never mark requirements implemented without my confirmation; suggest `/rtm-verify`.

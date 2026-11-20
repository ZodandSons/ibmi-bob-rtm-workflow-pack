# RTM for IBM i — Bob workflow pack + VS Code extension

Requirements traceability for RPGLE / SQLRPGLE / CLLE / DDS / Db2 for i projects:

```
product spec ─▶ functional requirements ─▶ impact analysis (existing apps) ─▶ technical specification
     ─▶ generated artifacts (programs, tables, DSPF/PRTF, CL) ─▶ unit / QA / headless tests ─▶ verified RTM
```

## Recommended approach: Bob does the thinking, the extension does the bookkeeping

A pure extension that calls a model itself would duplicate what Bob already has (model access, approvals,
file and terminal tools, MCP, IBM i context) and would be harder to use from Bob Shell or CI. So this is split:

| Layer | What it owns | Where |
|---|---|---|
| **Bob custom modes** | Role + permissions per phase: `rtm-analyst`, `rtm-architect` (docs-only edits), `rtm-builder`, `rtm-qa` | `.bob/custom_modes.yaml` |
| **Bob slash commands** | The workflow steps — work identically in Bob IDE and Bob Shell | `.bob/commands/rtm-*.md` |
| **Rules** | IBM i standards, environment safety, test conventions | `.bob/rules/ibmi-rtm.md` |
| **`rtm/rtm.json`** | The single source of truth for traceability (FR · IMP · ART · UT · QA · HQ) | your repo |
| **`.rtm/cli.js`** | Deterministic gate: id allocation, validation, build order, status, matrix | your repo, run by Bob and CI |
| **VS Code extension** | Traceability tree, matrix webview, problems on `rtm.json`, status bar, buttons that launch each Bob step | this package |

The key design choice: the AI never "remembers" traceability. It writes to `rtm.json`, and every command ends
by running `node .rtm/cli.js validate`, which fails on gaps. That makes the RTM auditable and lets you gate
builds and CI on it.

## Slash-command workflow

| Step | Command (mode) | Output |
|---|---|---|
| 0 | `/rtm-init ORDERS ORDDEV` (analyst) | `rtm/rtm.json`, folders, greenfield/brownfield detection |
| 1 | `/rtm-requirements docs/spec/credit-hold.md` (analyst) | `docs/requirements/functional-requirements.md`, FR-* with Given/When/Then, open questions |
| 2 | `/rtm-analyze` (architect, brownfield only) | `docs/analysis/impact-analysis.md`, IMP-* incl. callers & level-check ripple |
| 3 | `/rtm-techspec` (architect) | `docs/techspec/technical-specification.md` with [NEW]/[MOD]/[DEL] callouts; ART-*, UT-*, QA-*, HQ-* planned |
| 4 | `/rtm-tests` (qa) | RPGUnit sources, QA step scripts, headless scripts + `run-all.sh` |
| 5 | `/rtm-build` (builder) | Source generated/modified in build order, compiled to the dev library, statuses recorded |
| 6 | `/rtm-verify` (qa) | Test results in the RTM, `docs/rtm.md` matrix |
| any | `/rtm-change "<CR>"` · `/rtm-status` | Change-request delta with stable ids · one-screen status |

Each step stops for your review; nothing is promoted beyond the development library.
Step 3 must validate with **0 errors** before step 5 runs (the extension enforces this; the builder mode checks too).

### How the technical spec becomes executable
The narrative spec is for humans; the **artifact plan in `rtm.json` is what gets executed**. `/rtm-build` walks
`node .rtm/cli.js order` (tables/PFs → LFs/indexes → DSPF/PRTF → modules/SRVPGM → programs, then
explicit `dependsOn`), reads each artifact's `specRef` section, generates or edits the source, compiles with your
build tool (`makei`, Source Orbit, Code for IBM i actions, or CRT* commands) and records `generated/built/failed`.

### Testing model
- **Unit (UT)** — RPGUnit against NOMAIN modules / service programs. The rules push business logic out of
  DSPF programs so it is testable.
- **QA (QA)** — human step scripts for 5250 screens, including negative paths.
- **Headless (HQ)** — runnable over SSH with no 5250 session: seed with SQL → call the program
  non-interactively → assert Db2 / QSYS2 state → clean up. This is the reliable automation layer on IBM i.
  If you have a scriptable 5250 driver, the QA mode will also script screen flows; otherwise they stay QA manual
  and the gap is reported (`rtm.requireHeadless` turns that warning into an error).

## Install

1. Build: `npm install && npm run compile` (then `npx @vscode/vsce package` for a .vsix).
2. Install the .vsix in VS Code or Bob IDE (Extensions › … › Install from VSIX).
3. Open your project, run **RTM: Initialise project** — it also runs **RTM: Install Bob modes, commands & rules**,
   which copies `.bob/`, `rtm/templates/` and `.rtm/cli.js` into the repo (existing files are kept).
4. Settings → `rtm.bob.invocation`:
   - `shell-interactive` (default) — opens Bob Shell in the step's mode and types the slash command.
   - `ide-chat` — inside Bob IDE: copies the command and (optionally) focuses Bob chat.
   - `shell-headless` — `bob -p` for unattended runs; non-interactive Bob Shell only uses read-only tools unless
     you add your version's approval flag in `rtm.bob.extraArgs` (check `bob --help`).

**Without the extension:** copy `bob-pack/.bob` and `out/cli.js` + `out/rtm/` (as `.rtm/`) into a repo — the
whole workflow runs from Bob Shell slash commands alone. The extension adds the visual matrix and gating.

## CI gate
```sh
node .rtm/cli.js validate --require-headless   # exit 1 on any traceability gap
sh tests/headless/run-all.sh                   # headless QA against the test LPAR
node .rtm/cli.js matrix --out docs/rtm.md      # publish the matrix as a build artifact
```

## CLI
```
node .rtm/cli.js init <name> <LIB> <greenfield|brownfield>
node .rtm/cli.js validate [--json] [--require-headless]
node .rtm/cli.js order                       # build order
node .rtm/cli.js next-id FR|IMP|ART|UT|QA|HQ
node .rtm/cli.js set-status <id> <status> [detail]
node .rtm/cli.js matrix [--out docs/rtm.md]
```

## Validation rules
Duplicate/malformed ids · dangling references · object names >10 chars or invalid · orphan artifacts (scope creep) ·
brownfield modify/delete without an impact item · impact item with no implementing artifact · level-check change
with no dependent programs listed · dependency cycles · failed builds · FR without artifact / unit test / QA test ·
missing headless test (warning or error) · failed tests · "verified" with unpassed tests · missing acceptance criteria.

`examples/credit-hold/` is a brownfield sample that deliberately fails four checks — open it to see the tree and matrix.

## Verify before relying on
Written against Bob's documented `.bob/commands/*.md` slash commands and `.bob/custom_modes.yaml` modes.
Confirm the custom-mode field names (`groups`, `fileRegex`) and Bob Shell flags against your Bob version.

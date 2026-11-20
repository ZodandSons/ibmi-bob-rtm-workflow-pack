# Technical Specification — {{project}}

| Item | Value |
|---|---|
| Version / date | {{version}} · {{date}} |
| Product spec | {{inputs.productSpec}} |
| Functional requirements | {{inputs.requirementsDoc}} |
| Impact analysis | {{inputs.impactDoc}} (brownfield only) |
| Development library | {{project.library}} |
| Project type | greenfield / brownfield |

## 0. Change log
| Date | Change | FRs | Author |
|---|---|---|---|

## 1. Overview and scope
Purpose, in scope, out of scope, assumptions, constraints (release level, CCSID, commitment control, SQL vs DDS).

## 2. Change summary
| Tag | Object | Type | Action | FRs | IMP | Risk |
|---|---|---|---|---|---|---|
| [NEW] | | | create | | — | |
| [MOD] | | | modify | | IMP-nnn | |

Legend: **[NEW]** new object · **[MOD]** change to an existing object · **[DEL]** removal.
Each [MOD] below uses this callout:

> **[MOD] OBJNAME · FR-nnn · IMP-nnn**
> *Current:* what the object does today (procedure / subroutine / record format / field).
> *Required:* what it must do.
> *Affected:* procedures, record formats, fields, parameters. *Ripple:* callers to recompile / retest.

## 3. Architecture
Program/file/screen relationship diagram (Mermaid), call chain, activation groups, service programs and
binding directories, batch vs interactive flow.

## 4. Data design
### 4.1 New SQL tables / views / indexes
Full DDL per object (`CREATE OR REPLACE TABLE … FOR SYSTEM NAME …`), keys, constraints, labels, audit columns.
### 4.2 Changes to existing PF / LF / tables
DDS or ALTER lines added/changed, level-check impact, dependent objects, data conversion and backout.

## 5. Display and print design (DDS)
Per DSPF/PRTF: record formats, field table (name · type · len · row/col · usage · edit · validation · FR),
function keys, INDARA indicator map, subfile control, messages, and a 24x80 mock-up:
```
 CUSTINQ                 Customer Inquiry                    10/20/26
 ...
 F3=Exit  F5=Refresh  F12=Cancel
```

## 6. Program design
Per program/module/CL: type, purpose, parameters / PI, files and SQL used, procedures with responsibilities,
numbered processing logic, validation and error handling (messages, SQLSTATE), commitment control, FRs.

## 7. Build and deployment
Ordered object list (matches `node .rtm/cli.js order`), compile commands and options, binding,
library list, object authority, deployment steps, rollback.

## 8. Unit tests (RPGUnit)
| UT | Module / procedure | Case | Input | Expected | FRs |
|---|---|---|---|---|---|

## 9. QA test scripts
Per QA id: preconditions, data, steps (Step · Action · Input · Expected), negative paths, FRs.

## 10. Headless automated QA
Per HQ id: seed SQL, non-interactive call, SQL assertions, cleanup, expected exit code, FRs.
CI invocation and environment (SSH host, user profile, library list).

## 11. Regression scope (brownfield)
Existing behaviours to retest and how.

## 12. Open questions and risks

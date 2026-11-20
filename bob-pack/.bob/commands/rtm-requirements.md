---
description: Product specification → atomic, testable functional requirements in the RTM
argument-hint: <path-to-product-spec>
---
Derive functional requirements from the product specification named after the command
(default: `inputs.productSpec` in `rtm/rtm.json`).

1. Read the whole specification. List ambiguities, contradictions and missing information as numbered
   **Open questions**; do not invent answers. If a question blocks a requirement, write the requirement
   with `"status": "draft"` and reference the question.
2. Decompose into atomic requirements: one behaviour each, testable, implementation-free (no program names).
   Cover inputs and validation, processing rules, outputs (screens, reports, files), errors and messages,
   security/authority, audit, performance and batch/interactive behaviour.
3. For each requirement: next id from `node .rtm/cli.js next-id FR`, title, description, `source`
   (section of the spec), `priority` (must/should/could), and 2–5 acceptance criteria in Given/When/Then form
   with concrete data values.
4. Append them to `requirements` in `rtm/rtm.json` (status `draft`); set `inputs.productSpec` and
   `inputs.requirementsDoc = "docs/requirements/functional-requirements.md"`.
5. Write `docs/requirements/functional-requirements.md`: purpose, scope / out of scope, glossary, actors,
   the requirements grouped by feature (id, title, description, acceptance criteria, source), open questions.
6. Run `node .rtm/cli.js validate`. At this stage only missing-artifact/test errors are expected; fix anything else.
7. Ask me to review and approve. On approval, set the approved ones to `"status": "approved"`.
   Next step: `/rtm-analyze` for brownfield, `/rtm-techspec` for greenfield.

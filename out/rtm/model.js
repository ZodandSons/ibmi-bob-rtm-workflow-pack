"use strict";
// RTM data model. rtm/rtm.json is the single source of truth for traceability.
// Bob (the AI) writes narrative documents; this file is what gets validated.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ID_PATTERNS = void 0;
exports.emptyRtm = emptyRtm;
exports.ID_PATTERNS = {
    requirement: /^FR-\d{3,}$/,
    impact: /^IMP-\d{3,}$/,
    artifact: /^ART-\d{3,}$/,
    unit: /^UT-\d{3,}$/,
    'qa-manual': /^QA-\d{3,}$/,
    'qa-headless': /^HQ-\d{3,}$/,
};
function emptyRtm(name, library, mode) {
    return {
        version: 1,
        project: { name, library },
        mode,
        inputs: {},
        requirements: [],
        impact: [],
        artifacts: [],
        tests: [],
    };
}

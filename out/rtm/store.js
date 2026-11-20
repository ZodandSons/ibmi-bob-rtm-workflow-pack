"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadRtm = loadRtm;
exports.saveRtm = saveRtm;
exports.nextId = nextId;
exports.buildOrder = buildOrder;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function loadRtm(file) {
    const raw = fs.readFileSync(file, 'utf8');
    const doc = JSON.parse(raw);
    // Tolerate partially written files from the AI: default missing arrays.
    doc.requirements ??= [];
    doc.impact ??= [];
    doc.artifacts ??= [];
    doc.tests ??= [];
    doc.inputs ??= {};
    return doc;
}
function saveRtm(file, doc) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n', 'utf8');
}
/** Next free id for a prefix, e.g. nextId(doc, 'FR') -> FR-007 */
function nextId(doc, prefix) {
    const all = [
        ...doc.requirements.map(r => r.id),
        ...doc.impact.map(i => i.id),
        ...doc.artifacts.map(a => a.id),
        ...doc.tests.map(t => t.id),
    ];
    const re = new RegExp(`^${prefix}-(\\d+)$`);
    const max = all.reduce((m, id) => {
        const hit = re.exec(id);
        return hit ? Math.max(m, parseInt(hit[1], 10)) : m;
    }, 0);
    return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}
/** Topological build order of artifacts (deletes last). Throws on cycles. */
function buildOrder(doc) {
    const byId = new Map(doc.artifacts.map(a => [a.id, a]));
    const order = [];
    const state = new Map();
    const visit = (id, trail) => {
        const s = state.get(id);
        if (s === 'done')
            return;
        if (s === 'visiting')
            throw new Error(`Dependency cycle: ${[...trail, id].join(' -> ')}`);
        state.set(id, 'visiting');
        for (const dep of byId.get(id)?.dependsOn ?? [])
            if (byId.has(dep))
                visit(dep, [...trail, id]);
        state.set(id, 'done');
        order.push(id);
    };
    // Natural tiers first so independent objects still build in a sensible sequence.
    const tier = (t) => ['SQL_TABLE', 'PF'].includes(t) ? 0 :
        ['SQL_INDEX', 'SQL_VIEW', 'LF', 'SQL_TRIGGER', 'MSGF', 'DTAARA'].includes(t) ? 1 :
            ['DSPF', 'PRTF', 'CMD'].includes(t) ? 2 :
                ['MODULE', 'SRVPGM', 'BNDDIR', 'SQL_PROCEDURE'].includes(t) ? 3 : 4;
    const sorted = [...doc.artifacts]
        .filter(a => a.action !== 'delete')
        .sort((a, b) => tier(a.type) - tier(b.type) || a.id.localeCompare(b.id));
    for (const a of sorted)
        visit(a.id, []);
    for (const a of doc.artifacts)
        if (a.action === 'delete')
            order.push(a.id);
    return order;
}

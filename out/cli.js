#!/usr/bin/env node
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
/*
 * rtm-cli — deterministic RTM operations for Bob, Bob Shell and CI.
 *   node .rtm/cli.js validate [--rtm rtm/rtm.json] [--json] [--require-headless]
 *   node .rtm/cli.js matrix   [--rtm ...] [--out docs/rtm.md]
 *   node .rtm/cli.js order    [--rtm ...]            build order (topological)
 *   node .rtm/cli.js next-id  <FR|IMP|ART|UT|QA|HQ>  next free id
 *   node .rtm/cli.js set-status <ID> <status> [detail]   artifact or test result
 *   node .rtm/cli.js init <name> <library> <greenfield|brownfield>
 * Exit code 1 when validation has errors, so it works as a gate.
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const model_1 = require("./rtm/model");
const store_1 = require("./rtm/store");
const validate_1 = require("./rtm/validate");
const matrix_1 = require("./rtm/matrix");
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const has = (name) => argv.includes(name);
const rtmFile = path.resolve(flag('--rtm') ?? 'rtm/rtm.json');
const cmd = argv[0];
function main() {
    switch (cmd) {
        case 'init': {
            const [, name, lib, mode] = argv;
            if (!name || !lib || !['greenfield', 'brownfield'].includes(mode))
                return usage();
            if (fs.existsSync(rtmFile)) {
                console.error(`${rtmFile} already exists`);
                return 1;
            }
            (0, store_1.saveRtm)(rtmFile, (0, model_1.emptyRtm)(name, lib.toUpperCase(), mode));
            console.log(`Created ${rtmFile}`);
            return 0;
        }
        case 'validate': {
            const v = (0, validate_1.validate)((0, store_1.loadRtm)(rtmFile), { requireHeadless: has('--require-headless') });
            if (has('--json')) {
                console.log(JSON.stringify(v, null, 2));
                return v.errors ? 1 : 0;
            }
            for (const x of v.findings)
                console.log(`${x.severity.toUpperCase().padEnd(7)} ${x.code.padEnd(16)} ${x.ref.padEnd(9)} ${x.message}`);
            const ok = v.coverage.filter(c => c.verdict === 'covered').length;
            console.log(`\nRTM: ${ok}/${v.coverage.length} requirements traced · ${v.errors} errors · ${v.warnings} warnings`);
            return v.errors ? 1 : 0;
        }
        case 'matrix': {
            const doc = (0, store_1.loadRtm)(rtmFile);
            const md = (0, matrix_1.toMarkdown)(doc, (0, validate_1.validate)(doc));
            const out = flag('--out');
            if (out) {
                fs.mkdirSync(path.dirname(out), { recursive: true });
                fs.writeFileSync(out, md);
                console.log(`Wrote ${out}`);
            }
            else
                process.stdout.write(md);
            return 0;
        }
        case 'order': {
            const doc = (0, store_1.loadRtm)(rtmFile);
            for (const id of (0, store_1.buildOrder)(doc)) {
                const a = doc.artifacts.find(x => x.id === id);
                console.log(`${a.id}\t${a.action.toUpperCase()}\t${a.type}\t${a.name}\t${a.path}\t${a.status}`);
            }
            return 0;
        }
        case 'next-id': {
            const prefix = argv[1];
            if (!prefix)
                return usage();
            console.log((0, store_1.nextId)((0, store_1.loadRtm)(rtmFile), prefix.toUpperCase()));
            return 0;
        }
        case 'set-status': {
            const [, id, st, ...rest] = argv;
            if (!id || !st)
                return usage();
            const doc = (0, store_1.loadRtm)(rtmFile);
            const a = doc.artifacts.find(x => x.id === id);
            const t = doc.tests.find(x => x.id === id);
            const r = doc.requirements.find(x => x.id === id);
            if (a)
                a.status = st;
            else if (t)
                t.lastResult = { status: st, at: new Date().toISOString(), detail: rest.join(' ') || undefined };
            else if (r)
                r.status = st;
            else {
                console.error(`Unknown id ${id}`);
                return 1;
            }
            (0, store_1.saveRtm)(rtmFile, doc);
            console.log(`${id} -> ${st}`);
            return 0;
        }
        default:
            return usage();
    }
}
function usage() {
    console.error('usage: rtm-cli <init|validate|matrix|order|next-id|set-status> [args] [--rtm file]');
    return 2;
}
try {
    process.exit(main());
}
catch (e) {
    console.error(e.message ?? e);
    process.exit(1);
}

#!/usr/bin/env node
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
import * as fs from 'fs';
import * as path from 'path';
import { emptyRtm, ArtifactStatus, TestStatus, ReqStatus } from './rtm/model';
import { loadRtm, saveRtm, nextId, buildOrder } from './rtm/store';
import { validate } from './rtm/validate';
import { toMarkdown } from './rtm/matrix';

const argv = process.argv.slice(2);
const flag = (name: string) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const has = (name: string) => argv.includes(name);
const rtmFile = path.resolve(flag('--rtm') ?? 'rtm/rtm.json');
const cmd = argv[0];

function main(): number {
  switch (cmd) {
    case 'init': {
      const [, name, lib, mode] = argv;
      if (!name || !lib || !['greenfield', 'brownfield'].includes(mode)) return usage();
      if (fs.existsSync(rtmFile)) { console.error(`${rtmFile} already exists`); return 1; }
      saveRtm(rtmFile, emptyRtm(name, lib.toUpperCase(), mode as any));
      console.log(`Created ${rtmFile}`);
      return 0;
    }
    case 'validate': {
      const v = validate(loadRtm(rtmFile), { requireHeadless: has('--require-headless') });
      if (has('--json')) { console.log(JSON.stringify(v, null, 2)); return v.errors ? 1 : 0; }
      for (const x of v.findings) console.log(`${x.severity.toUpperCase().padEnd(7)} ${x.code.padEnd(16)} ${x.ref.padEnd(9)} ${x.message}`);
      const ok = v.coverage.filter(c => c.verdict === 'covered').length;
      console.log(`\nRTM: ${ok}/${v.coverage.length} requirements traced · ${v.errors} errors · ${v.warnings} warnings`);
      return v.errors ? 1 : 0;
    }
    case 'matrix': {
      const doc = loadRtm(rtmFile);
      const md = toMarkdown(doc, validate(doc));
      const out = flag('--out');
      if (out) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, md); console.log(`Wrote ${out}`); }
      else process.stdout.write(md);
      return 0;
    }
    case 'order': {
      const doc = loadRtm(rtmFile);
      for (const id of buildOrder(doc)) {
        const a = doc.artifacts.find(x => x.id === id)!;
        console.log(`${a.id}\t${a.action.toUpperCase()}\t${a.type}\t${a.name}\t${a.path}\t${a.status}`);
      }
      return 0;
    }
    case 'next-id': {
      const prefix = argv[1];
      if (!prefix) return usage();
      console.log(nextId(loadRtm(rtmFile), prefix.toUpperCase()));
      return 0;
    }
    case 'set-status': {
      const [, id, st, ...rest] = argv;
      if (!id || !st) return usage();
      const doc = loadRtm(rtmFile);
      const a = doc.artifacts.find(x => x.id === id);
      const t = doc.tests.find(x => x.id === id);
      const r = doc.requirements.find(x => x.id === id);
      if (a) a.status = st as ArtifactStatus;
      else if (t) t.lastResult = { status: st as TestStatus, at: new Date().toISOString(), detail: rest.join(' ') || undefined };
      else if (r) r.status = st as ReqStatus;
      else { console.error(`Unknown id ${id}`); return 1; }
      saveRtm(rtmFile, doc);
      console.log(`${id} -> ${st}`);
      return 0;
    }
    default:
      return usage();
  }
}

function usage(): number {
  console.error('usage: rtm-cli <init|validate|matrix|order|next-id|set-status> [args] [--rtm file]');
  return 2;
}

try { process.exit(main()); } catch (e: any) { console.error(e.message ?? e); process.exit(1); }

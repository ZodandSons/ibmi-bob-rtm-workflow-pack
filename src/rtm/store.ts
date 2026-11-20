import * as fs from 'fs';
import * as path from 'path';
import { RtmDocument } from './model';

export function loadRtm(file: string): RtmDocument {
  const raw = fs.readFileSync(file, 'utf8');
  const doc = JSON.parse(raw) as RtmDocument;
  // Tolerate partially written files from the AI: default missing arrays.
  doc.requirements ??= [];
  doc.impact ??= [];
  doc.artifacts ??= [];
  doc.tests ??= [];
  doc.inputs ??= {};
  return doc;
}

export function saveRtm(file: string, doc: RtmDocument): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n', 'utf8');
}

/** Next free id for a prefix, e.g. nextId(doc, 'FR') -> FR-007 */
export function nextId(doc: RtmDocument, prefix: string): string {
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
export function buildOrder(doc: RtmDocument): string[] {
  const byId = new Map(doc.artifacts.map(a => [a.id, a]));
  const order: string[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (id: string, trail: string[]) => {
    const s = state.get(id);
    if (s === 'done') return;
    if (s === 'visiting') throw new Error(`Dependency cycle: ${[...trail, id].join(' -> ')}`);
    state.set(id, 'visiting');
    for (const dep of byId.get(id)?.dependsOn ?? []) if (byId.has(dep)) visit(dep, [...trail, id]);
    state.set(id, 'done');
    order.push(id);
  };
  // Natural tiers first so independent objects still build in a sensible sequence.
  const tier = (t: string) =>
    ['SQL_TABLE', 'PF'].includes(t) ? 0 :
    ['SQL_INDEX', 'SQL_VIEW', 'LF', 'SQL_TRIGGER', 'MSGF', 'DTAARA'].includes(t) ? 1 :
    ['DSPF', 'PRTF', 'CMD'].includes(t) ? 2 :
    ['MODULE', 'SRVPGM', 'BNDDIR', 'SQL_PROCEDURE'].includes(t) ? 3 : 4;
  const sorted = [...doc.artifacts]
    .filter(a => a.action !== 'delete')
    .sort((a, b) => tier(a.type) - tier(b.type) || a.id.localeCompare(b.id));
  for (const a of sorted) visit(a.id, []);
  for (const a of doc.artifacts) if (a.action === 'delete') order.push(a.id);
  return order;
}

import { ID_PATTERNS, RtmDocument, Requirement, TestCase } from './model';
import { buildOrder } from './store';

export type Severity = 'error' | 'warning';
export interface Finding { severity: Severity; code: string; ref: string; message: string }

export interface CoverageRow {
  req: Requirement;
  artifacts: string[];
  unit: TestCase[];
  qa: TestCase[];
  headless: TestCase[];
  verdict: 'covered' | 'gap' | 'deferred';
}

export interface ValidationResult {
  findings: Finding[];
  coverage: CoverageRow[];
  errors: number;
  warnings: number;
}

export function validate(doc: RtmDocument, opts: { requireHeadless?: boolean } = {}): ValidationResult {
  const f: Finding[] = [];
  const add = (severity: Severity, code: string, ref: string, message: string) =>
    f.push({ severity, code, ref, message });

  // ---- ID integrity -------------------------------------------------------
  const seen = new Set<string>();
  const check = (id: string, pattern: RegExp, kind: string) => {
    if (seen.has(id)) add('error', 'DUP_ID', id, `Duplicate id ${id}`);
    seen.add(id);
    if (!pattern.test(id)) add('error', 'BAD_ID', id, `${kind} id "${id}" does not match ${pattern}`);
  };
  doc.requirements.forEach(r => check(r.id, ID_PATTERNS.requirement, 'Requirement'));
  doc.impact.forEach(i => check(i.id, ID_PATTERNS.impact, 'Impact'));
  doc.artifacts.forEach(a => check(a.id, ID_PATTERNS.artifact, 'Artifact'));
  doc.tests.forEach(t => check(t.id, ID_PATTERNS[t.kind] ?? /.*/, `Test (${t.kind})`));

  const reqIds = new Set(doc.requirements.map(r => r.id));
  const artIds = new Set(doc.artifacts.map(a => a.id));
  const impIds = new Set(doc.impact.map(i => i.id));

  // ---- Dangling references -----------------------------------------------
  const refs = (owner: string, ids: string[] | undefined, pool: Set<string>, what: string) =>
    (ids ?? []).forEach(id => { if (!pool.has(id)) add('error', 'DANGLING', owner, `References unknown ${what} ${id}`); });
  doc.impact.forEach(i => refs(i.id, i.reqIds, reqIds, 'requirement'));
  doc.artifacts.forEach(a => {
    refs(a.id, a.reqIds, reqIds, 'requirement');
    refs(a.id, a.dependsOn, artIds, 'artifact');
    refs(a.id, a.impactIds, impIds, 'impact item');
  });
  doc.tests.forEach(t => { refs(t.id, t.reqIds, reqIds, 'requirement'); refs(t.id, t.artifactIds, artIds, 'artifact'); });

  // ---- Artifact rules ------------------------------------------------------
  for (const a of doc.artifacts) {
    if (!a.reqIds?.length) add('warning', 'ORPHAN_ARTIFACT', a.id, `${a.name} is not traced to any requirement (scope creep?)`);
    if (a.name.length > 10) add('error', 'OBJ_NAME', a.id, `Object name ${a.name} exceeds 10 characters`);
    if (!/^[A-Z$#@][A-Z0-9$#@_]*$/.test(a.name)) add('error', 'OBJ_NAME', a.id, `Object name ${a.name} is not a valid IBM i name (use upper case)`);
    if (doc.mode === 'brownfield' && a.action !== 'new' && !a.impactIds?.length)
      add('error', 'NO_IMPACT', a.id, `${a.action} of existing object ${a.name} has no impact-analysis entry`);
    if (a.status === 'failed') add('error', 'BUILD_FAILED', a.id, `${a.name} failed to build`);
  }
  for (const i of doc.impact) {
    if (i.levelCheck && !(i.callers?.length))
      add('warning', 'LEVEL_CHECK', i.id, `${i.object} format changes but no dependent programs are listed for recompile`);
    if (!doc.artifacts.some(a => a.impactIds?.includes(i.id)))
      add('error', 'IMPACT_UNPLANNED', i.id, `Impact on ${i.object} has no artifact that implements the change`);
  }
  try { buildOrder(doc); } catch (e: any) { add('error', 'CYCLE', 'artifacts', e.message); }

  // ---- Requirement coverage ------------------------------------------------
  const coverage: CoverageRow[] = doc.requirements.map(req => {
    const artifacts = doc.artifacts.filter(a => a.reqIds?.includes(req.id)).map(a => a.id);
    const tests = doc.tests.filter(t => t.reqIds?.includes(req.id));
    const unit = tests.filter(t => t.kind === 'unit');
    const qa = tests.filter(t => t.kind === 'qa-manual');
    const headless = tests.filter(t => t.kind === 'qa-headless');
    if (req.status === 'deferred') return { req, artifacts, unit, qa, headless, verdict: 'deferred' as const };

    let gap = false;
    const miss = (sev: Severity, code: string, msg: string) => { if (sev === 'error') gap = true; add(sev, code, req.id, msg); };
    if (!req.acceptanceCriteria?.length) miss('warning', 'NO_AC', 'No acceptance criteria — tests cannot be objective');
    if (!artifacts.length) miss('error', 'NO_ARTIFACT', 'No artifact implements this requirement');
    if (!unit.length) miss('error', 'NO_UNIT_TEST', 'No unit test traces to this requirement');
    if (!qa.length && !headless.length) miss('error', 'NO_QA_TEST', 'No QA test (manual or headless) traces to this requirement');
    if (!headless.length) miss(opts.requireHeadless ? 'error' : 'warning', 'NO_HEADLESS', 'No automated headless QA test');

    const all = [...unit, ...qa, ...headless];
    const failed = all.filter(t => t.lastResult?.status === 'fail');
    failed.forEach(t => miss('error', 'TEST_FAILED', `${t.id} failed${t.lastResult?.detail ? ': ' + t.lastResult.detail : ''}`));
    if (req.status === 'verified' && all.some(t => t.lastResult?.status !== 'pass'))
      miss('error', 'FALSE_VERIFIED', 'Marked verified but not every traced test has passed');
    if (req.status === 'implemented' && all.some(t => !t.lastResult || t.lastResult.status === 'not-run'))
      miss('warning', 'NOT_RUN', 'Implemented but some traced tests have not been run');

    return { req, artifacts, unit, qa, headless, verdict: gap ? 'gap' as const : 'covered' as const };
  });

  return {
    findings: f,
    coverage,
    errors: f.filter(x => x.severity === 'error').length,
    warnings: f.filter(x => x.severity === 'warning').length,
  };
}

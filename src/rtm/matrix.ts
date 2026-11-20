import { RtmDocument, TestCase } from './model';
import { ValidationResult } from './validate';

const status = (tests: TestCase[]) =>
  tests.length === 0 ? '—' :
  tests.map(t => `${t.id}${t.lastResult ? ' ' + icon(t.lastResult.status) : ''}`).join(', ');

const icon = (s: string) => ({ pass: '✅', fail: '❌', blocked: '⛔', 'not-run': '⏳' } as Record<string, string>)[s] ?? '';

export function toMarkdown(doc: RtmDocument, v: ValidationResult): string {
  const lines: string[] = [];
  lines.push(`# Requirements Traceability Matrix — ${doc.project.name}`, '');
  lines.push(`Mode: **${doc.mode}** · Target library: \`${doc.project.library}\` · Generated ${new Date().toISOString()}`, '');
  lines.push(`**${v.coverage.filter(c => c.verdict === 'covered').length}/${v.coverage.length}** requirements fully traced · ${v.errors} errors · ${v.warnings} warnings`, '');
  lines.push('| Req | Title | Status | Artifacts | Unit | QA | Headless | Trace |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const c of v.coverage) {
    const arts = c.artifacts.map(id => {
      const a = doc.artifacts.find(x => x.id === id)!;
      return `${a.name} (${a.action === 'new' ? 'NEW' : a.action === 'modify' ? 'MOD' : 'DEL'})`;
    }).join(', ') || '—';
    lines.push(`| ${c.req.id} | ${esc(c.req.title)} | ${c.req.status} | ${arts} | ${status(c.unit)} | ${status(c.qa)} | ${status(c.headless)} | ${c.verdict === 'covered' ? '✅' : c.verdict === 'deferred' ? '⏸' : '⚠️ gap'} |`);
  }
  if (v.findings.length) {
    lines.push('', '## Findings', '');
    for (const x of v.findings) lines.push(`- **${x.severity.toUpperCase()}** \`${x.code}\` ${x.ref}: ${x.message}`);
  }
  return lines.join('\n') + '\n';
}

export function toHtml(doc: RtmDocument, v: ValidationResult, nonce: string): string {
  const row = (c: ValidationResult['coverage'][number]) => {
    const arts = c.artifacts.map(id => {
      const a = doc.artifacts.find(x => x.id === id)!;
      return `<span class="pill ${a.action}" title="${a.type} · ${a.status}">${a.name}</span>`;
    }).join(' ') || '<span class="none">none</span>';
    const t = (ts: TestCase[]) => ts.map(x =>
      `<span class="pill t-${x.lastResult?.status ?? 'not-run'}" title="${esc(x.title)}">${x.id}</span>`).join(' ') || '<span class="none">none</span>';
    return `<tr class="${c.verdict}"><td><a data-id="${c.req.id}">${c.req.id}</a></td><td>${esc(c.req.title)}</td>
      <td>${c.req.status}</td><td>${arts}</td><td>${t(c.unit)}</td><td>${t(c.qa)}</td><td>${t(c.headless)}</td>
      <td class="verdict">${c.verdict}</td></tr>`;
  };
  const findings = v.findings.map(x =>
    `<li class="${x.severity}"><code>${x.code}</code> <b>${x.ref}</b> ${esc(x.message)}</li>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
 body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);padding:12px}
 table{border-collapse:collapse;width:100%;font-size:12px}
 th,td{border-bottom:1px solid var(--vscode-panel-border);padding:6px;text-align:left;vertical-align:top}
 th{position:sticky;top:0;background:var(--vscode-editor-background)}
 .pill{display:inline-block;border-radius:9px;padding:1px 7px;margin:1px;border:1px solid var(--vscode-panel-border)}
 .new{border-color:#3fb950}.modify{border-color:#d29922}.delete{border-color:#f85149;text-decoration:line-through}
 .t-pass{background:#3fb95033}.t-fail{background:#f8514955}.t-blocked{background:#d2992244}
 tr.gap .verdict{color:#f85149;font-weight:600} tr.covered .verdict{color:#3fb950} tr.deferred{opacity:.6}
 .none{opacity:.5} li.error code{color:#f85149} li.warning code{color:#d29922} a{cursor:pointer;color:var(--vscode-textLink-foreground)}
 .summary{margin:8px 0 14px}
</style></head><body>
<h2>RTM — ${esc(doc.project.name)}</h2>
<div class="summary">${doc.mode} · ${doc.project.library} · <b>${v.coverage.filter(c => c.verdict === 'covered').length}/${v.coverage.length}</b> traced · ${v.errors} errors · ${v.warnings} warnings</div>
<table><thead><tr><th>Req</th><th>Title</th><th>Status</th><th>Artifacts</th><th>Unit</th><th>QA</th><th>Headless</th><th>Trace</th></tr></thead>
<tbody>${v.coverage.map(row).join('')}</tbody></table>
${findings ? `<h3>Findings</h3><ul>${findings}</ul>` : ''}
<script nonce="${nonce}">
 const vscode = acquireVsCodeApi();
 document.querySelectorAll('a[data-id]').forEach(a => a.addEventListener('click', () => vscode.postMessage({ reveal: a.dataset.id })));
</script></body></html>`;
}

// Same escaping is safe for both outputs: markdown tables only need the pipe escaped.
function esc(s: string): string {
  return (s ?? '').replace(/[&<>"|]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '|': '&#124;' } as Record<string, string>)[c]);
}

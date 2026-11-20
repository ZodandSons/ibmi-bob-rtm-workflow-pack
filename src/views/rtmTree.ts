import * as vscode from 'vscode';
import { RtmDocument } from '../rtm/model';
import { ValidationResult } from '../rtm/validate';

type Node =
  | { kind: 'group'; label: string; children: Node[]; icon: string }
  | { kind: 'leaf'; label: string; description?: string; tooltip?: string; icon: string; color?: string; id?: string };

export class RtmTreeProvider implements vscode.TreeDataProvider<Node> {
  private emitter = new vscode.EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData = this.emitter.event;
  private roots: Node[] = [];

  update(doc: RtmDocument | undefined, v: ValidationResult | undefined) {
    if (!doc || !v) { this.roots = []; this.emitter.fire(undefined); return; }
    const reqs: Node[] = v.coverage.map(c => ({
      kind: 'group',
      label: `${c.req.id}  ${c.req.title}`,
      icon: c.verdict === 'covered' ? 'pass' : c.verdict === 'deferred' ? 'debug-pause' : 'warning',
      children: [
        ...c.artifacts.map(id => {
          const a = doc.artifacts.find(x => x.id === id)!;
          return leaf(`${a.name}`, `${a.type} · ${a.action.toUpperCase()} · ${a.status}`, a.action === 'new' ? 'add' : a.action === 'modify' ? 'edit' : 'trash', a.id);
        }),
        ...[...c.unit, ...c.qa, ...c.headless].map(t =>
          leaf(t.id, `${t.kind} · ${t.lastResult?.status ?? 'not-run'}`, t.lastResult?.status === 'pass' ? 'check' : t.lastResult?.status === 'fail' ? 'error' : 'beaker', t.id)),
        ...v.findings.filter(f => f.ref === c.req.id).map(f => leaf(f.code, f.message, f.severity === 'error' ? 'error' : 'warning')),
      ],
    }));
    const other = v.findings.filter(f => !doc.requirements.some(r => r.id === f.ref));
    this.roots = [
      { kind: 'group', label: `Requirements (${doc.requirements.length})`, icon: 'checklist', children: reqs },
      { kind: 'group', label: `Impact analysis (${doc.impact.length})`, icon: 'references', children:
        doc.impact.map(i => leaf(`${i.object}`, `${i.type} · risk ${i.risk} · ${i.reqIds.join(',')}`, 'symbol-reference', i.id, i.change)) },
      { kind: 'group', label: `Artifacts (${doc.artifacts.length})`, icon: 'package', children:
        doc.artifacts.map(a => leaf(`${a.name}`, `${a.type} · ${a.action.toUpperCase()} · ${a.status}`, 'file-code', a.id, a.path)) },
      { kind: 'group', label: `Other findings (${other.length})`, icon: 'issues', children:
        other.map(f => leaf(`${f.ref} ${f.code}`, f.message, f.severity === 'error' ? 'error' : 'warning')) },
    ];
    this.emitter.fire(undefined);
  }

  getChildren(n?: Node): Node[] { return n ? (n.kind === 'group' ? n.children : []) : this.roots; }

  getTreeItem(n: Node): vscode.TreeItem {
    const item = new vscode.TreeItem(n.label,
      n.kind === 'group' && n.children.length ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon(n.icon);
    if (n.kind === 'leaf') {
      item.description = n.description;
      item.tooltip = n.tooltip ?? n.description;
      if (n.id) item.command = { command: 'rtm.revealId', title: 'Reveal', arguments: [n.id] };
    }
    return item;
  }
}

function leaf(label: string, description: string, icon: string, id?: string, tooltip?: string): Node {
  return { kind: 'leaf', label, description, icon, id, tooltip };
}

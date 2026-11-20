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
exports.RtmTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
class RtmTreeProvider {
    emitter = new vscode.EventEmitter();
    onDidChangeTreeData = this.emitter.event;
    roots = [];
    update(doc, v) {
        if (!doc || !v) {
            this.roots = [];
            this.emitter.fire(undefined);
            return;
        }
        const reqs = v.coverage.map(c => ({
            kind: 'group',
            label: `${c.req.id}  ${c.req.title}`,
            icon: c.verdict === 'covered' ? 'pass' : c.verdict === 'deferred' ? 'debug-pause' : 'warning',
            children: [
                ...c.artifacts.map(id => {
                    const a = doc.artifacts.find(x => x.id === id);
                    return leaf(`${a.name}`, `${a.type} · ${a.action.toUpperCase()} · ${a.status}`, a.action === 'new' ? 'add' : a.action === 'modify' ? 'edit' : 'trash', a.id);
                }),
                ...[...c.unit, ...c.qa, ...c.headless].map(t => leaf(t.id, `${t.kind} · ${t.lastResult?.status ?? 'not-run'}`, t.lastResult?.status === 'pass' ? 'check' : t.lastResult?.status === 'fail' ? 'error' : 'beaker', t.id)),
                ...v.findings.filter(f => f.ref === c.req.id).map(f => leaf(f.code, f.message, f.severity === 'error' ? 'error' : 'warning')),
            ],
        }));
        const other = v.findings.filter(f => !doc.requirements.some(r => r.id === f.ref));
        this.roots = [
            { kind: 'group', label: `Requirements (${doc.requirements.length})`, icon: 'checklist', children: reqs },
            { kind: 'group', label: `Impact analysis (${doc.impact.length})`, icon: 'references', children: doc.impact.map(i => leaf(`${i.object}`, `${i.type} · risk ${i.risk} · ${i.reqIds.join(',')}`, 'symbol-reference', i.id, i.change)) },
            { kind: 'group', label: `Artifacts (${doc.artifacts.length})`, icon: 'package', children: doc.artifacts.map(a => leaf(`${a.name}`, `${a.type} · ${a.action.toUpperCase()} · ${a.status}`, 'file-code', a.id, a.path)) },
            { kind: 'group', label: `Other findings (${other.length})`, icon: 'issues', children: other.map(f => leaf(`${f.ref} ${f.code}`, f.message, f.severity === 'error' ? 'error' : 'warning')) },
        ];
        this.emitter.fire(undefined);
    }
    getChildren(n) { return n ? (n.kind === 'group' ? n.children : []) : this.roots; }
    getTreeItem(n) {
        const item = new vscode.TreeItem(n.label, n.kind === 'group' && n.children.length ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        item.iconPath = new vscode.ThemeIcon(n.icon);
        if (n.kind === 'leaf') {
            item.description = n.description;
            item.tooltip = n.tooltip ?? n.description;
            if (n.id)
                item.command = { command: 'rtm.revealId', title: 'Reveal', arguments: [n.id] };
        }
        return item;
    }
}
exports.RtmTreeProvider = RtmTreeProvider;
function leaf(label, description, icon, id, tooltip) {
    return { kind: 'leaf', label, description, icon, id, tooltip };
}

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { emptyRtm, RtmDocument } from './rtm/model';
import { loadRtm, saveRtm } from './rtm/store';
import { validate, ValidationResult } from './rtm/validate';
import { toHtml, toMarkdown } from './rtm/matrix';
import { RtmTreeProvider } from './views/rtmTree';
import { runBobStep, STEPS } from './bob/runner';

let doc: RtmDocument | undefined;
let result: ValidationResult | undefined;
let panel: vscode.WebviewPanel | undefined;
const tree = new RtmTreeProvider();
const output = vscode.window.createOutputChannel('RTM for IBM i');
const diagnostics = vscode.languages.createDiagnosticCollection('rtm');

const root = () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
const rtmPath = () => {
  const r = root();
  return r ? path.join(r, vscode.workspace.getConfiguration('rtm').get<string>('file', 'rtm/rtm.json')) : undefined;
};

export function activate(ctx: vscode.ExtensionContext) {
  vscode.window.registerTreeDataProvider('rtmExplorer', tree);
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
  status.command = 'rtm.showMatrix';
  ctx.subscriptions.push(status, output, diagnostics);

  const refresh = () => {
    const file = rtmPath();
    if (!file || !fs.existsSync(file)) { doc = result = undefined; tree.update(undefined, undefined); status.hide(); return; }
    try {
      doc = loadRtm(file);
      result = validate(doc, { requireHeadless: vscode.workspace.getConfiguration('rtm').get('requireHeadless', false) });
      tree.update(doc, result);
      const ok = result.coverage.filter(c => c.verdict === 'covered').length;
      status.text = `$(${result.errors ? 'warning' : 'pass'}) RTM ${ok}/${result.coverage.length}`;
      status.tooltip = `${result.errors} errors · ${result.warnings} warnings — click for matrix`;
      status.show();
      publishDiagnostics(file);
      if (panel) panel.webview.html = toHtml(doc, result, nonce());
    } catch (e: any) {
      status.text = '$(error) RTM invalid'; status.show();
      output.appendLine(`Cannot parse ${file}: ${e.message}`);
    }
  };

  const watcher = vscode.workspace.createFileSystemWatcher('**/rtm/rtm.json');
  watcher.onDidChange(refresh); watcher.onDidCreate(refresh); watcher.onDidDelete(refresh);
  ctx.subscriptions.push(watcher);

  const reg = (id: string, fn: (...a: any[]) => any) => ctx.subscriptions.push(vscode.commands.registerCommand(id, fn));

  reg('rtm.installBobPack', async () => {
    const r = root(); if (!r) return noWorkspace();
    const copied = copyTree(path.join(ctx.extensionPath, 'bob-pack'), r, false);
    // Ship the deterministic CLI into the project so Bob, Bob Shell and CI can run the same gate.
    const outDir = path.join(ctx.extensionPath, 'out');
    fs.mkdirSync(path.join(r, '.rtm', 'rtm'), { recursive: true });
    fs.copyFileSync(path.join(outDir, 'cli.js'), path.join(r, '.rtm', 'cli.js'));
    for (const f of fs.readdirSync(path.join(outDir, 'rtm')).filter(f => f.endsWith('.js')))
      fs.copyFileSync(path.join(outDir, 'rtm', f), path.join(r, '.rtm', 'rtm', f));
    copyTree(path.join(ctx.extensionPath, 'templates'), path.join(r, 'rtm', 'templates'), false);
    vscode.window.showInformationMessage(`Installed Bob modes, ${copied} command/rule files, templates and .rtm/cli.js. Existing files were kept.`);
  });

  reg('rtm.init', async () => {
    const file = rtmPath(); if (!file) return noWorkspace();
    if (fs.existsSync(file)) return vscode.window.showWarningMessage('rtm/rtm.json already exists.');
    const name = await vscode.window.showInputBox({ prompt: 'Project name', value: path.basename(root()!) });
    if (!name) return;
    const library = (await vscode.window.showInputBox({ prompt: 'Development / build library (never production)', validateInput: v => /^[A-Za-z$#@][A-Za-z0-9$#@_]{0,9}$/.test(v) ? undefined : 'Valid IBM i library name, max 10' }))?.toUpperCase();
    if (!library) return;
    const mode = await vscode.window.showQuickPick(
      [{ label: 'brownfield', detail: 'Modify an existing application — impact analysis required' },
       { label: 'greenfield', detail: 'New application' }], { title: 'Project type' });
    if (!mode) return;
    saveRtm(file, emptyRtm(name, library, mode.label as RtmDocument['mode']));
    refresh();
    if (!fs.existsSync(path.join(root()!, '.bob', 'custom_modes.yaml'))) await vscode.commands.executeCommand('rtm.installBobPack');
  });

  reg('rtm.importSpec', async (uri?: vscode.Uri) => {
    const file = rtmPath(); if (!file || !doc) return needRtm();
    const pick = uri ?? (await vscode.window.showOpenDialog({ canSelectMany: false, filters: { Specs: ['md', 'txt', 'docx', 'pdf'] } }))?.[0];
    if (!pick) return;
    const rel = path.relative(root()!, pick.fsPath).replace(/\\/g, '/');
    doc.inputs.productSpec = rel; saveRtm(file, doc);
    await runBobStep(STEPS.requirements, rel, root()!);
  });

  for (const [key, step] of Object.entries(STEPS)) {
    reg(`rtm.step.${key}`, async () => {
      const r = root(); if (!r) return noWorkspace();
      if (key !== 'init' && !doc) return needRtm();
      if (key === 'build' && result?.errors) {
        const go = await vscode.window.showWarningMessage(
          `RTM has ${result.errors} errors. Building from an incomplete specification breaks traceability.`, { modal: true }, 'Build anyway');
        if (go !== 'Build anyway') return;
      }
      const args = ['build', 'change'].includes(key)
        ? await vscode.window.showInputBox({ prompt: key === 'build' ? 'Artifact ids to build (blank = all pending)' : 'Describe the change request', ignoreFocusOut: true })
        : '';
      if (args === undefined) return;
      await runBobStep(step, args, r);
    });
  }

  reg('rtm.validate', () => {
    refresh();
    if (!result) return needRtm();
    output.clear();
    for (const f of result.findings) output.appendLine(`${f.severity.toUpperCase().padEnd(8)}${f.code.padEnd(18)}${f.ref.padEnd(10)}${f.message}`);
    output.appendLine(`\n${result.errors} errors · ${result.warnings} warnings`);
    output.show(true);
  });

  reg('rtm.showMatrix', () => {
    if (!doc || !result) return needRtm();
    if (panel) { panel.reveal(); return; }
    panel = vscode.window.createWebviewPanel('rtmMatrix', 'Traceability Matrix', vscode.ViewColumn.Active, { enableScripts: true });
    panel.webview.html = toHtml(doc, result, nonce());
    panel.webview.onDidReceiveMessage(m => m.reveal && vscode.commands.executeCommand('rtm.revealId', m.reveal));
    panel.onDidDispose(() => (panel = undefined));
  });

  reg('rtm.exportMatrix', async () => {
    if (!doc || !result) return needRtm();
    const out = path.join(root()!, 'docs', 'rtm.md');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, toMarkdown(doc, result));
    await vscode.window.showTextDocument(vscode.Uri.file(out));
  });

  reg('rtm.revealId', async (id: string) => {
    const file = rtmPath(); if (!file) return;
    const text = fs.readFileSync(file, 'utf8');
    const idx = text.indexOf(`"id": "${id}"`);
    const editor = await vscode.window.showTextDocument(vscode.Uri.file(file), { preview: true });
    if (idx >= 0) {
      const pos = editor.document.positionAt(idx);
      editor.selection = new vscode.Selection(pos, pos);
      editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
    }
  });

  reg('rtm.refresh', refresh);
  refresh();
}

function publishDiagnostics(file: string) {
  if (!result) return;
  const text = fs.readFileSync(file, 'utf8');
  const d = result.findings.map(f => {
    const idx = text.indexOf(`"id": "${f.ref}"`);
    const lines = idx >= 0 ? text.slice(0, idx).split('\n') : [''];
    const pos = new vscode.Position(lines.length - 1, lines[lines.length - 1].length);
    const diag = new vscode.Diagnostic(new vscode.Range(pos, pos.translate(0, f.ref.length + 8)),
      `${f.code}: ${f.message}`, f.severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning);
    diag.source = 'RTM';
    return diag;
  });
  diagnostics.set(vscode.Uri.file(file), d);
}

function copyTree(src: string, dest: string, overwrite: boolean): number {
  let n = 0;
  if (!fs.existsSync(src)) return 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name), t = path.join(dest, entry.name);
    if (entry.isDirectory()) { fs.mkdirSync(t, { recursive: true }); n += copyTree(s, t, overwrite); }
    else if (overwrite || !fs.existsSync(t)) { fs.mkdirSync(path.dirname(t), { recursive: true }); fs.copyFileSync(s, t); n++; }
  }
  return n;
}

const nonce = () => crypto.randomBytes(16).toString('hex');
const noWorkspace = () => vscode.window.showErrorMessage('Open the project folder first.');
const needRtm = () => vscode.window.showWarningMessage('No rtm/rtm.json yet — run "RTM: Initialise project".', 'Initialise')
  .then((c: string | undefined) => c && vscode.commands.executeCommand('rtm.init'));

export function deactivate() {}

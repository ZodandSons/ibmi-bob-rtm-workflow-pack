import * as vscode from 'vscode';

/**
 * Each pipeline step = a Bob custom mode + a Bob slash command (both shipped in bob-pack/).
 * The extension never talks to a model itself: Bob owns the AI, approvals and IBM i tooling;
 * the extension owns the RTM data, the gate and the UI.
 */
export interface BobStep { command: string; mode: string; label: string }

export const STEPS: Record<string, BobStep> = {
  init:         { command: 'rtm-init',         mode: 'rtm-analyst',   label: 'Initialise RTM' },
  requirements: { command: 'rtm-requirements', mode: 'rtm-analyst',   label: 'Product spec → functional requirements' },
  analyze:      { command: 'rtm-analyze',      mode: 'rtm-architect', label: 'Impact analysis of existing application' },
  techspec:     { command: 'rtm-techspec',     mode: 'rtm-architect', label: 'Functional requirements → technical specification' },
  build:        { command: 'rtm-build',        mode: 'rtm-builder',   label: 'Execute technical specification' },
  tests:        { command: 'rtm-tests',        mode: 'rtm-qa',        label: 'Generate unit / QA / headless tests' },
  verify:       { command: 'rtm-verify',       mode: 'rtm-qa',        label: 'Run tests and record results' },
  change:       { command: 'rtm-change',       mode: 'rtm-analyst',   label: 'Apply a change request' },
  status:       { command: 'rtm-status',       mode: 'rtm-analyst',   label: 'RTM status report' },
};

let terminal: vscode.Terminal | undefined;

export async function runBobStep(step: BobStep, args: string, cwd: string): Promise<void> {
  const cfg = vscode.workspace.getConfiguration('rtm.bob');
  const bob = cfg.get<string>('path', 'bob');
  const invocation = cfg.get<'ide-chat' | 'shell-interactive' | 'shell-headless'>('invocation', 'shell-interactive');
  const extra = cfg.get<string[]>('extraArgs', []).join(' ');
  const slash = `/${step.command}${args ? ' ' + args : ''}`;

  if (invocation === 'ide-chat') {
    // Running inside IBM Bob IDE: put the slash command on the clipboard and focus Bob's chat.
    await vscode.env.clipboard.writeText(slash);
    const focusCmd = cfg.get<string>('chatFocusCommand', '');
    if (focusCmd) { try { await vscode.commands.executeCommand(focusCmd); } catch { /* not available */ } }
    vscode.window.showInformationMessage(`Switch Bob to "${step.mode}" and paste: ${slash}`, 'OK');
    return;
  }

  if (!terminal || terminal.exitStatus !== undefined) {
    terminal = vscode.window.createTerminal({ name: 'Bob · RTM', cwd });
  }
  terminal.show(true);

  if (invocation === 'shell-headless') {
    // Non-interactive: Bob Shell defaults to read-only tools here, so pass your
    // approval flag in rtm.bob.extraArgs (check `bob --help` for your version).
    terminal.sendText(`${bob} --chat-mode=${step.mode} ${extra} -p ${quote(slash)}`);
    return;
  }

  // Interactive Bob Shell: start the session in the right mode, then type the command.
  const initialFlag = cfg.get<string>('initialPromptFlag', '');
  if (initialFlag) {
    terminal.sendText(`${bob} --chat-mode=${step.mode} ${extra} ${initialFlag} ${quote(slash)}`);
  } else {
    terminal.sendText(`${bob} --chat-mode=${step.mode} ${extra}`);
    await new Promise(r => setTimeout(r, cfg.get<number>('startupDelayMs', 3000)));
    terminal.sendText(slash);
  }
}

function quote(s: string): string {
  return process.platform === 'win32' ? `"${s.replace(/"/g, '\\"')}"` : `'${s.replace(/'/g, `'\\''`)}'`;
}

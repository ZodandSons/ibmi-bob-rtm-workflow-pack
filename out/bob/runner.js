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
exports.STEPS = void 0;
exports.runBobStep = runBobStep;
const vscode = __importStar(require("vscode"));
exports.STEPS = {
    init: { command: 'rtm-init', mode: 'rtm-analyst', label: 'Initialise RTM' },
    requirements: { command: 'rtm-requirements', mode: 'rtm-analyst', label: 'Product spec → functional requirements' },
    analyze: { command: 'rtm-analyze', mode: 'rtm-architect', label: 'Impact analysis of existing application' },
    techspec: { command: 'rtm-techspec', mode: 'rtm-architect', label: 'Functional requirements → technical specification' },
    build: { command: 'rtm-build', mode: 'rtm-builder', label: 'Execute technical specification' },
    tests: { command: 'rtm-tests', mode: 'rtm-qa', label: 'Generate unit / QA / headless tests' },
    verify: { command: 'rtm-verify', mode: 'rtm-qa', label: 'Run tests and record results' },
    change: { command: 'rtm-change', mode: 'rtm-analyst', label: 'Apply a change request' },
    status: { command: 'rtm-status', mode: 'rtm-analyst', label: 'RTM status report' },
};
let terminal;
async function runBobStep(step, args, cwd) {
    const cfg = vscode.workspace.getConfiguration('rtm.bob');
    const bob = cfg.get('path', 'bob');
    const invocation = cfg.get('invocation', 'shell-interactive');
    const extra = cfg.get('extraArgs', []).join(' ');
    const slash = `/${step.command}${args ? ' ' + args : ''}`;
    if (invocation === 'ide-chat') {
        // Running inside IBM Bob IDE: put the slash command on the clipboard and focus Bob's chat.
        await vscode.env.clipboard.writeText(slash);
        const focusCmd = cfg.get('chatFocusCommand', '');
        if (focusCmd) {
            try {
                await vscode.commands.executeCommand(focusCmd);
            }
            catch { /* not available */ }
        }
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
    const initialFlag = cfg.get('initialPromptFlag', '');
    if (initialFlag) {
        terminal.sendText(`${bob} --chat-mode=${step.mode} ${extra} ${initialFlag} ${quote(slash)}`);
    }
    else {
        terminal.sendText(`${bob} --chat-mode=${step.mode} ${extra}`);
        await new Promise(r => setTimeout(r, cfg.get('startupDelayMs', 3000)));
        terminal.sendText(slash);
    }
}
function quote(s) {
    return process.platform === 'win32' ? `"${s.replace(/"/g, '\\"')}"` : `'${s.replace(/'/g, `'\\''`)}'`;
}

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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const sorter_1 = require("./sorter");
const webview_1 = require("./webview");
const watcher_1 = require("./watcher");
const l10n = __importStar(require("@vscode/l10n"));
// ────────────────────────────────────────────────────────────────────────────
// Extension activation
// ────────────────────────────────────────────────────────────────────────────
function activate(context) {
    // ── Command: right-click a folder in Explorer ──────────────────────────
    const locale = vscode.env.language;
    const bundleUri = vscode.Uri.joinPath(context.extensionUri, 'l10n', `bundle.l10n.${locale}.json`);
    l10n.config({ uri: bundleUri.toString() });
    const sortFolderCmd = vscode.commands.registerCommand("autoFileSorter.sortFolder", async (uri) => {
        // If called from command palette without a target, ask user to pick
        const targetUri = uri ?? (await pickFolder());
        if (!targetUri) {
            return;
        }
        await runSortDialog(targetUri, context);
    });
    // ── Command: sort all folders in the workspace ─────────────────────────
    const sortWorkspaceCmd = vscode.commands.registerCommand("autoFileSorter.sortWorkspace", async () => {
        const ws = vscode.workspace.workspaceFolders;
        if (!ws || ws.length === 0) {
            vscode.window.setStatusBarMessage(l10n.t("Please open a workspace folder first."), 3000);
            return;
        }
        for (const folder of ws) {
            await runSortDialog(folder.uri, context);
        }
    });
    context.subscriptions.push(sortFolderCmd, sortWorkspaceCmd);
}
// ────────────────────────────────────────────────────────────────────────────
// Show the sort dialog webview, then apply
// ────────────────────────────────────────────────────────────────────────────
async function runSortDialog(folderUri, context) {
    const config = vscode.workspace.getConfiguration("autoFileSorter");
    const defaultFormat = config.get("defaultFormat", "space");
    const defaultSortBy = config.get("defaultSortBy", "name");
    const watchForChanges = config.get("watchForChanges", true);
    // Create the webview panel
    const panel = vscode.window.createWebviewPanel("autoFileSorterDialog", l10n.t("Sort: {0}", path.basename(folderUri.fsPath)), vscode.ViewColumn.Active, {
        enableScripts: true,
        retainContextWhenHidden: false,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
    });
    const fileEntries = (0, sorter_1.readEntries)(folderUri.fsPath);
    const fileList = fileEntries.map(e => ({ name: e.name, ext: e.ext }));
    const iconUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'media', 'filesorter_icon.png'));
    const lang = vscode.env.language;
    panel.webview.html = (0, webview_1.getSortDialogHtml)(panel, defaultFormat, defaultSortBy, fileList, iconUri, {
        subtitle: l10n.t("Configure sorting rules and apply"),
        tabSort: l10n.t("Sort files"),
        tabUndo: l10n.t("Undo sorting"),
        numberFormat: l10n.t("Numbering format"),
        separatorSpace: l10n.t("Space separator"),
        separatorDot: l10n.t("Dot separator"),
        separatorUnderscore: l10n.t("Underscore"),
        previewLabel: l10n.t("Preview:"),
        sortMethod: l10n.t("Sorting method"),
        sortByName: l10n.t("By file name"),
        sortByAlphaNum: l10n.t("Alphabetical / Number order"),
        sortByCreationTime: l10n.t("By creation time"),
        sortEarliestFirst: l10n.t("Earliest first"),
        sortScope: l10n.t("Sorting scope"),
        scopeAllFiles: l10n.t("All files"),
        numberingUnified: l10n.t("Unified numbering regardless of type"),
        sortByFileType: l10n.t("By file type"),
        numberingByType: l10n.t("Separate numbering by type"),
        groupDisplay: l10n.t("Display after grouping"),
        groupByType: l10n.t("Group by type"),
        groupInterleave: l10n.t("Interleave by sequence"),
        otherOptions: l10n.t("Other options"),
        replaceExistingNumbers: l10n.t("Replace existing numbering"),
        removeOldPrefixAndResort: l10n.t("Detect and remove existing numeric prefixes before re-sorting"),
        excludeFilesLabel: l10n.t("Exclude these files from sorting"),
        excludeExpandHint: l10n.t("Expand to select files or types to exclude"),
        excludeByFile: l10n.t("By file"),
        excludeByType: l10n.t("By type"),
        cancelButton: l10n.t("Cancel"),
        startSortButton: l10n.t("Start Sorting"),
        formatMatchHint: l10n.t("My sorting method matches the numbering format:"),
        undoDirect: l10n.t("Undo Directly"),
        undoConfirm: l10n.t("Confirm Undo"),
        folderLabel: l10n.t("Folder"),
        regexInputPlaceholder: l10n.t("Please enter a regular expression"),
        formatUnmatchHint: l10n.t("My sorting method doesn't match the numbering format:"),
        willset: l10n.t("Will set"),
        to: l10n.t("to"),
        regexHelp: lang.startsWith("zh") ? `【常见编号示例】<br>
        · 1-、01-、001- →  <code style="color:var(--accent);">^\\d{1,3}\\-</code><br>
        · 1.、01.、001. →  <code style="color:var(--accent);">^\\d{1,3}\\.</code><br>
        · 1_、01_ →  <code style="color:var(--accent);">^\\d{1,3}\\_</code><br>
        · 1 空格 →  <code style="color:var(--accent);">^\\d{1,3}\\s</code><br><br>

        【通用写法（推荐）】<br>
        · 单层编号 →  <code style="color:var(--accent);">^\\d{1,3}[\\s._-]</code><br>
        · 多层编号（如 01-01-、1.2.3.）<br>
                  → <code style="color:var(--accent);">^(\\d{1,3}[\\s._-])+</code><br><br>

        【重要说明】<br>
        · * 在这里不是“任意字符”,不支持 * 这种通配符写法<br><br>` : `【Common numbering examples】<br>
        · 1-、01-、001- →  <code style="color:var(--accent);">^\\d{1,3}\\-</code><br>
        · 1.、01.、001. →  <code style="color:var(--accent);">^\\d{1,3}\\.</code><br>
        · 1_、01_ →  <code style="color:var(--accent);">^\\d{1,3}\\_</code><br>
        · 1 (space) →  <code style="color:var(--accent);">^\\d{1,3}\\s</code><br><br>

        【General patterns (recommended)】<br>
        · Single-level numbering →  <code style="color:var(--accent);">^\\d{1,3}[\\s._-]</code><br>
        · Multi-level numbering (e.g. 01-01-, 1.2.3.)<br>
                  → <code style="color:var(--accent);">^(\\d{1,3}[\\s._-])+</code><br><br>

        【Important notes】<br>
        · * here does NOT mean “any character”; wildcard * is not supported<br><br>`,
    });
    // Wait for user to click Confirm or Cancel
    const result = await new Promise((resolve) => {
        panel.webview.onDidReceiveMessage((msg) => {
            if (msg.type === "confirm") {
                resolve({
                    format: msg.format,
                    sortBy: msg.sortBy,
                    removeExisting: msg.removeExisting,
                    scope: msg.scope,
                    groupDisplay: msg.groupDisplay,
                    excludedFiles: msg.excludedFiles ?? [],
                    excludedExts: msg.excludedExts ?? [],
                });
                panel.dispose();
            }
            else if (msg.type === "undo") {
                let pattern;
                if (msg.customPattern) {
                    try {
                        pattern = new RegExp(msg.customPattern);
                    }
                    catch {
                        pattern = undefined;
                    }
                }
                const undoOps = (0, sorter_1.buildUndoOperations)(folderUri.fsPath, pattern);
                (0, watcher_1.disposeAllWatchers)();
                (0, sorter_1.executeRenames)(undoOps);
                // 删除排序时把资源管理器排列方式重置回默认
                vscode.workspace.getConfiguration().update("explorer.sortOrder", "default", vscode.ConfigurationTarget.Global);
                vscode.window.setStatusBarMessage(l10n.t("✅ Undone numbering for {0} files.", undoOps.length), 3000);
                resolve(null);
                panel.dispose();
            }
            else {
                resolve(null);
                panel.dispose();
            }
        }, undefined, context.subscriptions);
        // If panel is closed without confirming
        panel.onDidDispose(() => resolve(null), null, context.subscriptions);
    });
    if (!result) {
        return; // user cancelled
    }
    const options = {
        format: result.format,
        sortBy: result.sortBy,
        removeExisting: result.removeExisting,
        scope: result.scope,
        groupDisplay: result.groupDisplay,
        excludedFiles: result.excludedFiles,
        excludedExts: result.excludedExts,
    };
    // Build and execute rename plan
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Auto File Sorter",
        cancellable: false,
    }, async (progress) => {
        progress.report({ message: l10n.t("Analyzing files…") });
        const ops = (0, sorter_1.buildRenameOperations)(folderUri.fsPath, options);
        if (ops === "TOO_MANY") {
            vscode.window.showWarningMessage(l10n.t("File count exceeds 999. Please split files into multiple subfolders before sorting."));
            return;
        }
        // ← 新增
        if (ops === "EMPTY") {
            vscode.window.setStatusBarMessage(l10n.t("This folder is empty. No files to sort."), 3000);
            return;
        }
        if (ops.length === 0) {
            vscode.window.setStatusBarMessage(l10n.t("All files are already in order. No changes needed."), 3000);
            return;
        }
        progress.report({ message: l10n.t("Renaming {0} files…", ops.length) });
        try {
            (0, sorter_1.executeRenames)(ops);
            // 根据分组展示方式同步 VSCode 资源管理器排列方式
            if (options.scope === "byType") {
                const sortOrder = options.groupDisplay === "byType" ? "type" : "default";
                vscode.workspace.getConfiguration().update("explorer.sortOrder", sortOrder, vscode.ConfigurationTarget.Global);
            }
            vscode.window.setStatusBarMessage(l10n.t("✅ Done! Renamed {0} files.", ops.length), 3000);
        }
        catch (err) {
            vscode.window.showErrorMessage(l10n.t("Rename failed: {0}", String(err)));
            return;
        }
        // Start watching for future changes
        if (watchForChanges) {
            (0, watcher_1.watchFolder)(folderUri, options, context);
        }
    });
}
// ────────────────────────────────────────────────────────────────────────────
// Helper: ask user to pick a folder via quick-open
// ────────────────────────────────────────────────────────────────────────────
async function pickFolder() {
    const result = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: l10n.t("Select a folder to sort"),
    });
    return result?.[0];
}
// ────────────────────────────────────────────────────────────────────────────
// Extension deactivation
// ────────────────────────────────────────────────────────────────────────────
function deactivate() {
    (0, watcher_1.disposeAllWatchers)();
}

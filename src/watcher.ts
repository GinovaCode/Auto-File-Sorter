import * as vscode from "vscode";
import * as path from "path";
import {
  buildRenameOperations,
  executeRenames,
  SortOptions,
  getSeparator,
  readEntries,
  groupByType,
  sortEntries,
  pad,
  getDigits,
  parseInsertionIndex,
  // stripExistingPrefix,
} from "./sorter"; 
import * as l10n from '@vscode/l10n';

const folderWatchers = new Map<string, vscode.FileSystemWatcher>();
const debounceTimers = new Map<string, NodeJS.Timeout>();
const pendingRenames = new Map<string, number>(); // 存时间戳
const outputChannel = vscode.window.createOutputChannel("Auto File Sorter Debug");

export function watchFolder(
  folderUri: vscode.Uri,
  options: SortOptions,
  context: vscode.ExtensionContext
): void {
  const folderPath = folderUri.fsPath;
  _disposeWatcher(folderPath);
  _registerWatcher(folderUri, folderPath, options, context);
}

function _registerWatcher(
  folderUri: vscode.Uri,
  folderPath: string,
  options: SortOptions,
  context: vscode.ExtensionContext
): void {
  const pattern = new vscode.RelativePattern(folderUri, "*");
  const watcher = vscode.workspace.createFileSystemWatcher(
    pattern,
    false, // 监听 create
    true,  // 不监听 change
    true   // 不监听 delete
  );

  watcher.onDidCreate((uri: vscode.Uri) => {
    const changedFolder = path.dirname(uri.fsPath);
    const fileName = path.basename(uri.fsPath);
    const lastSort = pendingRenames.get(changedFolder);
    outputChannel.appendLine(`[create触发] ${fileName} | 时间:${Date.now()} | lastSort:${lastSort ?? '无'} | 差值:${lastSort ? Date.now()-lastSort : 'N/A'}ms`);
    if (changedFolder !== folderPath) return;
   
    

    // 过滤掉插件自己产生的临时文件
    if (fileName.endsWith(".__sort_tmp__")) return;

    // 带有合法编号前缀的 create 事件，一定是插件重命名产生的，忽略
    // （用户新建的文件不可能自带 "00 " / "01." 这样的前缀）
    const RENAME_ARTIFACT_RE = /^\d{2,3}[ ._]/;
    if (RENAME_ARTIFACT_RE.test(fileName)) return;

    // 如果是插件自己刚刚重命名产生的文件，忽略
    const sortTime = pendingRenames.get(folderPath);
    if (sortTime && Date.now() - sortTime < 5000) return;

    // 到这里才是用户真正新建的无编号文件
    const existing = debounceTimers.get(folderPath);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      debounceTimers.delete(folderPath);
      _disposeWatcher(folderPath);
      handleInsertionSort(uri.fsPath, folderPath, options);
      // 延迟重注册，等文件系统事件全部消化完再开始监听
      _registerWatcher(folderUri, folderPath, options, context);
    }, 800);

    debounceTimers.set(folderPath, timer);
  });

  folderWatchers.set(folderPath, watcher);
  context.subscriptions.push(watcher);
}

function _disposeWatcher(folderPath: string): void {
  const existing = folderWatchers.get(folderPath);
  if (existing) {
    existing.dispose();
    folderWatchers.delete(folderPath);
  }
}

function handleInsertionSort(
  changedFilePath: string,
  folderPath: string,
  options: SortOptions
): void {
   outputChannel.appendLine(`[排序执行] ${path.basename(changedFilePath)}`);
  try {
    const allEntries = readEntries(folderPath).filter(
      e => !options.excludedFiles.includes(e.name) && !options.excludedExts.includes(e.ext)
    );
    if (allEntries.length === 0) return;

    const digits = getDigits(allEntries.length);
    if (!digits) {
      vscode.window.showWarningMessage(l10n.t("Auto File Sorter: File count exceeds limit. Please split into subfolders."));
      return;
    }

    const sep = getSeparator(options.format);
    const changedName = path.basename(changedFilePath);
    const requestedIdx = parseInsertionIndex(changedName); // 新文件自带的编号，如03
    const ops: { from: string; to: string }[] = [];

    if (options.scope === "all") {
      // ── 全部文件插入式重排 ──────────────────────────────────────
      // 1. 把新文件单独提取出来
      const newEntry = allEntries.find(e => e.fullPath === changedFilePath);
      outputChannel.appendLine(`[查找新文件] changedFilePath:${changedFilePath} | 找到:${newEntry ? newEntry.name : '未找到'} | 所有文件:${allEntries.map(e=>e.name).join(',')}`);
      if (!newEntry) return;
      const existingEntries = allEntries.filter(e => e.fullPath !== changedFilePath);

      // 2. 其余文件按现有编号数值排序（保持原有顺序）
      const sortedExisting = [...existingEntries].sort((a, b) => {
        const idxA = parseInsertionIndex(a.name) ?? 9999;
        const idxB = parseInsertionIndex(b.name) ?? 9999;
        return idxA - idxB;
      });

      // 3. 把新文件插入到指定位置（没有编号则追加到末尾）
      const insertAt = requestedIdx !== null
        ? Math.min(requestedIdx, sortedExisting.length)
        : sortedExisting.length;
      sortedExisting.splice(insertAt, 0, newEntry);

      // 4. 从0开始重新连续编号
      const totalDigits = getDigits(sortedExisting.length) ?? 2;
      sortedExisting.forEach((entry, idx) => {
        const prefix = pad(idx, totalDigits) + sep;
        const newName = prefix + entry.baseName;
        if (newName !== entry.name) {
          ops.push({
            from: path.join(folderPath, entry.name),
            to: path.join(folderPath, newName),
          });
        }
      });

    } else {
      // ── 按类型分组插入式重排 ────────────────────────────────────
      const changedExt = path.extname(changedName).toLowerCase() || "__dir__";
      const groups = groupByType(allEntries);

      for (const [ext, group] of groups) {
        const newEntry = group.find(e => e.fullPath === changedFilePath);
        const existingEntries = group.filter(e => e.fullPath !== changedFilePath);

        // 其余文件按现有编号数值排序
        const sortedExisting = [...existingEntries].sort((a, b) => {
          const idxA = parseInsertionIndex(a.name) ?? 9999;
          const idxB = parseInsertionIndex(b.name) ?? 9999;
          return idxA - idxB;
        });

        if (ext === changedExt && newEntry) {
          // 把新文件插入到指定位置
          const insertAt = requestedIdx !== null
            ? Math.min(requestedIdx, sortedExisting.length)
            : sortedExisting.length;
          sortedExisting.splice(insertAt, 0, newEntry);
        }

        const groupDigits = getDigits(sortedExisting.length) ?? 2;
        sortedExisting.forEach((entry, idx) => {
          const prefix = pad(idx, groupDigits) + sep;
          const newName = prefix + entry.baseName;
          if (newName !== entry.name) {
            ops.push({
              from: path.join(folderPath, entry.name),
              to: path.join(folderPath, newName),
            });
          }
        });
      }
    }

    if (ops.length > 0) {
      executeRenames(ops);
      pendingRenames.set(folderPath, Date.now()); // 记录排序时间戳
    }

  } catch (err) {
    vscode.window.showErrorMessage(l10n.t("Auto File Sorter: Rename failed: {0}", String(err)));
  }
}



export function disposeAllWatchers(): void {
  for (const [folderPath] of folderWatchers) {
    _disposeWatcher(folderPath);
  }
}
import * as fs from "fs";
import * as path from "path";

export type NumberFormat = "space" | "dot" | "underscore";
export type SortBy = "name" | "created";
export type GroupDisplay = "byType" | "byIndex";
export type SortScope = "all" | "byType";

export interface SortOptions {
  format: NumberFormat;
  sortBy: SortBy;
  removeExisting: boolean;
  scope: SortScope;
  groupDisplay: GroupDisplay;
  excludedFiles: string[];
  excludedExts: string[];
}

export interface FileEntry {
  name: string;
  fullPath: string;
  ext: string;
  isDirectory: boolean;
  birthtime: Date;
  baseName: string; // name without existing numeric prefix
}

export interface RenameOperation {
  from: string;
  to: string;
}

// ── Separator character for each format ─────────────────────────────────────
export function getSeparator(format: NumberFormat): string {
  switch (format) {
    case "space":
      return " ";
    case "dot":
      return ".";
    case "underscore":
      return "_";
  }
}

// ── Determine how many digits are needed based on total file count ────────────
export function getDigits(count: number): number | null {
  if (count <= 99) {
    return 2;
  } else if (count <= 999) {
    return 3;
  } else {
    return null; // signals "too many – split into sub-folders"
  }
}

// ── Padding helper ───────────────────────────────────────────────────────────
export function pad(n: number, digits: number): string {
  return String(n).padStart(digits, "0");
}

// ── Regex that matches a leading numeric prefix we previously added ──────────
// Matches patterns like: "00 ", "00.", "00_", "001 ", "001.", "001_"
const EXISTING_PREFIX_RE = /^(\d{2,3})([ ._])/;

export function stripExistingPrefix(name: string): string {
  return name.replace(EXISTING_PREFIX_RE, "");
}

export function hasExistingPrefix(name: string): boolean {
  return EXISTING_PREFIX_RE.test(name);
}

// ── Read a directory and build FileEntry list ────────────────────────────────
export function readEntries(folderPath: string): FileEntry[] {
  const names = fs.readdirSync(folderPath);
  const entries: FileEntry[] = [];

  for (const name of names) {
    if (name.startsWith(".")) {
      continue;
    }
    const fullPath = path.join(folderPath, name);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }
    const isDirectory = stat.isDirectory();
    const ext = isDirectory ? "__dir__" : path.extname(name).toLowerCase();
    const baseName = stripExistingPrefix(name);

    entries.push({
      name,
      fullPath,
      ext,
      isDirectory,
      birthtime: stat.birthtime,
      baseName,
    });
  }
  return entries;
}

// ── Group entries by extension ───────────────────────────────────────────────
export function groupByType(entries: FileEntry[]): Map<string, FileEntry[]> {
  const map = new Map<string, FileEntry[]>();
  for (const entry of entries) {
    const group = map.get(entry.ext) ?? [];
    group.push(entry);
    map.set(entry.ext, group);
  }
  return map;
}

// ── Sort entries within a group ──────────────────────────────────────────────
export function sortEntries(
  entries: FileEntry[],
  sortBy: SortBy
): FileEntry[] {
  return [...entries].sort((a, b) => {
    if (sortBy === "created") {
      return a.birthtime.getTime() - b.birthtime.getTime();
    }
    return a.baseName.localeCompare(b.baseName, undefined, {
      sensitivity: "base",
    });
  });
}

// ── Build rename plan for a single folder ───────────────────────────────────
export function buildRenameOperations(
  folderPath: string,
  options: SortOptions
): RenameOperation[] | "TOO_MANY" | "EMPTY" {
  const entries = readEntries(folderPath);
  const filteredEntries = entries.filter(
    e => !options.excludedFiles.includes(e.name) && !options.excludedExts.includes(e.ext)
  );

  if (entries.length === 0) {       // ← 新增：文件夹本身为空
    return "EMPTY";
  }
  
  if (filteredEntries.length === 0) {
    return [];
  }

  const digits = getDigits(filteredEntries.length);
  if (digits === null) {
    return "TOO_MANY";
  }

  const ops: RenameOperation[] = [];
  const sep = getSeparator(options.format);




  if (options.scope === "all") {
    const totalDigits = getDigits(filteredEntries.length) ?? 2;

    // 检测是否有重复编号（说明用户插入了新文件）
    const indexCount = new Map<number, number>();
    for (const e of filteredEntries) {
      const idx = parseInsertionIndex(e.name);
      if (idx !== null) {
        indexCount.set(idx, (indexCount.get(idx) ?? 0) + 1);
      }
    }
    const duplicateIdx = Array.from(indexCount.entries()).find(([, count]) => count > 1)?.[0];

    let sorted: FileEntry[];
    if (duplicateIdx !== undefined) {
      // 插入模式：找出重复编号中没有旧编号的那个（即新插入的文件）
      const candidates = filteredEntries.filter(e => parseInsertionIndex(e.name) === duplicateIdx);
      const newFile = candidates.find(e => !hasExistingPrefix(e.name)) ?? candidates[candidates.length - 1];
      
      // 其余文件按现有编号排序
      const others = filteredEntries.filter(e => e !== newFile).sort((a, b) => {
        const ia = parseInsertionIndex(a.name) ?? 9999;
        const ib = parseInsertionIndex(b.name) ?? 9999;
        return ia - ib;
      });
      
      // 把新文件插入到指定位置
      const insertAt = others.findIndex(e => {
        const idx = parseInsertionIndex(e.name);
        return idx !== null && idx >= duplicateIdx;
      });

      if (insertAt === -1) {
        others.push(newFile);
      } else {
        others.splice(insertAt, 0, newFile);
      }
      sorted = others;
    } else {
      // 正常模式：按用户选择的排序方式
      sorted = sortEntries(filteredEntries, options.sortBy);
    }

    sorted.forEach((entry, idx) => {
        const prefix = pad(idx, totalDigits) + sep;
        const targetBase = entry.baseName; // 始终用baseName，插入模式下必须剥掉旧编号
        const newName = prefix + targetBase;
      if (newName !== entry.name) {
        ops.push({
          from: path.join(folderPath, entry.name),
          to: path.join(folderPath, newName),
        });
      }
    });






  } else {
    // ── 按文件类型分组 ────────────────────────────────────────────
    const groups = groupByType(filteredEntries);

    if (options.groupDisplay === "byIndex") {
      // 按序号交错：每组各取第N个，同一轮次编号相同
      // 例：第0轮 → 00.readme.txt、00.main.py
      //     第1轮 → 01.notes.txt、01.util.py
      const sortedGroups: FileEntry[][] = Array.from(groups.values()).map(
        group => sortEntries(group, options.sortBy)
      );
      const maxLen = Math.max(...sortedGroups.map(g => g.length));
      const roundDigits = getDigits(maxLen) ?? 2;

      for (let round = 0; round < maxLen; round++) {
        for (const group of sortedGroups) {
          if (round >= group.length) continue;
          const entry = group[round];
          const prefix = pad(round, roundDigits) + sep;
          const targetBase = entry.baseName;
          const newName = prefix + targetBase;
          if (newName !== entry.name) {
            ops.push({
              from: path.join(folderPath, entry.name),
              to: path.join(folderPath, newName),
            });
          }
        }
      }

    } else {

      // 按类型聚合：每组独立从00开始编号
      for (const [, group] of groups) {
        const groupDigits = getDigits(group.length) ?? 2;

        // 检测该组内是否有重复编号
        const indexCount = new Map<number, number>();
        for (const e of group) {
          const idx = parseInsertionIndex(e.name);
          if (idx !== null) indexCount.set(idx, (indexCount.get(idx) ?? 0) + 1);
        }
        const duplicateIdx = Array.from(indexCount.entries()).find(([, count]) => count > 1)?.[0];

        let sorted: FileEntry[];
        if (duplicateIdx !== undefined) {
          const candidates = group.filter(e => parseInsertionIndex(e.name) === duplicateIdx);
          const newFile = candidates.find(e => !hasExistingPrefix(e.name)) ?? candidates[candidates.length - 1];
          const others = group.filter(e => e !== newFile).sort((a, b) => {
            return (parseInsertionIndex(a.name) ?? 9999) - (parseInsertionIndex(b.name) ?? 9999);
          });
          const insertAt = duplicateIdx; // 直接插入到重复编号的位置，不需要Min
          others.splice(insertAt, 0, newFile);
          sorted = others;
        } else {
          sorted = sortEntries(group, options.sortBy);
        }

        sorted.forEach((entry, idx) => {
          const prefix = pad(idx, groupDigits) + sep;
          const targetBase = entry.baseName;
          const newName = prefix + targetBase;
          if (newName !== entry.name) {
            ops.push({
              from: path.join(folderPath, entry.name),
              to: path.join(folderPath, newName),
            });
          }
        });
      }
    }
  }

  return ops;
}

// ── Execute rename operations ────────────────────────────────────────────────
export function executeRenames(ops: RenameOperation[]): void {
  // Two-pass rename to avoid collisions (e.g. 01→02 when 02 already exists).
  const tempOps: { temp: string; final: string }[] = [];

  for (const op of ops) {
    const temp = op.to + ".__sort_tmp__";
    fs.renameSync(op.from, temp);
    tempOps.push({ temp, final: op.to });
  }

  for (const { temp, final } of tempOps) {
    fs.renameSync(temp, final);
  }
}

// ── Determine insertion position when a new / renamed file appears ───────────
export function parseInsertionIndex(fileName: string): number | null {
  const m = EXISTING_PREFIX_RE.exec(fileName);
  if (!m) {
    return null;
  }
  return parseInt(m[1], 10);
}

// ── Strip/check prefix helpers (re-exported for watcher) ────────────────────
// (already defined above, no duplicates needed)

export function buildUndoOperations(
  folderPath: string,
  customPattern?: RegExp
): RenameOperation[] {
  const pattern = customPattern ?? EXISTING_PREFIX_RE;
  const entries = readEntries(folderPath);
  const ops: RenameOperation[] = [];
  for (const entry of entries) {
    if (pattern.test(entry.name)) {
      const newName = entry.name.replace(pattern, "");
      if (newName && newName !== entry.name) {
        ops.push({
          from: path.join(folderPath, entry.name),
          to: path.join(folderPath, newName),
        });
      }
    }
  }
  return ops;
}
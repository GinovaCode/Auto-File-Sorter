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
exports.getSeparator = getSeparator;
exports.getDigits = getDigits;
exports.pad = pad;
exports.stripExistingPrefix = stripExistingPrefix;
exports.hasExistingPrefix = hasExistingPrefix;
exports.readEntries = readEntries;
exports.groupByType = groupByType;
exports.sortEntries = sortEntries;
exports.buildRenameOperations = buildRenameOperations;
exports.executeRenames = executeRenames;
exports.parseInsertionIndex = parseInsertionIndex;
exports.buildUndoOperations = buildUndoOperations;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ── Separator character for each format ─────────────────────────────────────
function getSeparator(format) {
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
function getDigits(count) {
    if (count <= 99) {
        return 2;
    }
    else if (count <= 999) {
        return 3;
    }
    else {
        return null; // signals "too many – split into sub-folders"
    }
}
// ── Padding helper ───────────────────────────────────────────────────────────
function pad(n, digits) {
    return String(n).padStart(digits, "0");
}
// ── Regex that matches a leading numeric prefix we previously added ──────────
// Matches patterns like: "00 ", "00.", "00_", "001 ", "001.", "001_"
const EXISTING_PREFIX_RE = /^(\d{2,3})([ ._])/;
function stripExistingPrefix(name) {
    return name.replace(EXISTING_PREFIX_RE, "");
}
function hasExistingPrefix(name) {
    return EXISTING_PREFIX_RE.test(name);
}
// ── Read a directory and build FileEntry list ────────────────────────────────
function readEntries(folderPath) {
    const names = fs.readdirSync(folderPath);
    const entries = [];
    for (const name of names) {
        if (name.startsWith(".")) {
            continue;
        }
        const fullPath = path.join(folderPath, name);
        let stat;
        try {
            stat = fs.statSync(fullPath);
        }
        catch {
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
function groupByType(entries) {
    const map = new Map();
    for (const entry of entries) {
        const group = map.get(entry.ext) ?? [];
        group.push(entry);
        map.set(entry.ext, group);
    }
    return map;
}
// ── Sort entries within a group ──────────────────────────────────────────────
function sortEntries(entries, sortBy) {
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
function buildRenameOperations(folderPath, options) {
    const entries = readEntries(folderPath);
    const filteredEntries = entries.filter(e => !options.excludedFiles.includes(e.name) && !options.excludedExts.includes(e.ext));
    if (entries.length === 0) { // ← 新增：文件夹本身为空
        return "EMPTY";
    }
    if (filteredEntries.length === 0) {
        return [];
    }
    const digits = getDigits(filteredEntries.length);
    if (digits === null) {
        return "TOO_MANY";
    }
    const ops = [];
    const sep = getSeparator(options.format);
    if (options.scope === "all") {
        const totalDigits = getDigits(filteredEntries.length) ?? 2;
        // 检测是否有重复编号（说明用户插入了新文件）
        const indexCount = new Map();
        for (const e of filteredEntries) {
            const idx = parseInsertionIndex(e.name);
            if (idx !== null) {
                indexCount.set(idx, (indexCount.get(idx) ?? 0) + 1);
            }
        }
        const duplicateIdx = Array.from(indexCount.entries()).find(([, count]) => count > 1)?.[0];
        let sorted;
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
            }
            else {
                others.splice(insertAt, 0, newFile);
            }
            sorted = others;
        }
        else {
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
    }
    else {
        // ── 按文件类型分组 ────────────────────────────────────────────
        const groups = groupByType(filteredEntries);
        if (options.groupDisplay === "byIndex") {
            // 按序号交错：每组各取第N个，同一轮次编号相同
            // 例：第0轮 → 00.readme.txt、00.main.py
            //     第1轮 → 01.notes.txt、01.util.py
            const sortedGroups = Array.from(groups.values()).map(group => sortEntries(group, options.sortBy));
            const maxLen = Math.max(...sortedGroups.map(g => g.length));
            const roundDigits = getDigits(maxLen) ?? 2;
            for (let round = 0; round < maxLen; round++) {
                for (const group of sortedGroups) {
                    if (round >= group.length)
                        continue;
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
        }
        else {
            // 按类型聚合：每组独立从00开始编号
            for (const [, group] of groups) {
                const groupDigits = getDigits(group.length) ?? 2;
                // 检测该组内是否有重复编号
                const indexCount = new Map();
                for (const e of group) {
                    const idx = parseInsertionIndex(e.name);
                    if (idx !== null)
                        indexCount.set(idx, (indexCount.get(idx) ?? 0) + 1);
                }
                const duplicateIdx = Array.from(indexCount.entries()).find(([, count]) => count > 1)?.[0];
                let sorted;
                if (duplicateIdx !== undefined) {
                    const candidates = group.filter(e => parseInsertionIndex(e.name) === duplicateIdx);
                    const newFile = candidates.find(e => !hasExistingPrefix(e.name)) ?? candidates[candidates.length - 1];
                    const others = group.filter(e => e !== newFile).sort((a, b) => {
                        return (parseInsertionIndex(a.name) ?? 9999) - (parseInsertionIndex(b.name) ?? 9999);
                    });
                    const insertAt = duplicateIdx; // 直接插入到重复编号的位置，不需要Min
                    others.splice(insertAt, 0, newFile);
                    sorted = others;
                }
                else {
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
function executeRenames(ops) {
    // Two-pass rename to avoid collisions (e.g. 01→02 when 02 already exists).
    const tempOps = [];
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
function parseInsertionIndex(fileName) {
    const m = EXISTING_PREFIX_RE.exec(fileName);
    if (!m) {
        return null;
    }
    return parseInt(m[1], 10);
}
// ── Strip/check prefix helpers (re-exported for watcher) ────────────────────
// (already defined above, no duplicates needed)
function buildUndoOperations(folderPath, customPattern) {
    const pattern = customPattern ?? EXISTING_PREFIX_RE;
    const entries = readEntries(folderPath);
    const ops = [];
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

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSortDialogHtml = getSortDialogHtml;
function getSortDialogHtml(panel, defaultFormat, defaultSortBy, fileList, iconUri, labels) {
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="zh-CN">

<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${panel.webview.cspSource}; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auto File Sorter</title>
  <style nonce="${nonce}">
    :root {
      --bg: var(--vscode-editor-background);
      --surface: var(--vscode-sideBar-background);
      --surface2: var(--vscode-input-background);
      --border: var(--vscode-panel-border);
      --accent: var(--vscode-button-background);
      --accent2: var(--vscode-button-hoverBackground);
      --text: var(--vscode-editor-foreground);
      --text-muted: var(--vscode-descriptionForeground);
      --success: var(--vscode-testing-iconPassed);
      --text-bold: var(--vscode-editor-foreground);
      --text-accent: var(--vscode-button-background);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    input { width: 100%; }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      display: block;
      width: 100%;
      box-sizing: border-box;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.5);
    }

    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 28px;
    }

    .logo {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }

    h1 {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    .subtitle {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .section {
      margin-bottom: 22px;
    }

    .section-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-muted);
      margin-bottom: 10px;
    }

    .options-grid {
      display: grid;
      gap: 8px;
    }

    .options-grid.cols-3 {
      grid-template-columns: repeat(3, 1fr);
    }

    .option-btn {
      background: var(--surface2);
      border: 1.5px solid var(--border);
      border-radius: var(--radius);
      padding: 12px 8px;
      cursor: pointer;
      text-align: center;
      transition: all 0.15s ease;
      color: var(--text);
      font-family: var(--font);
      font-size: 13px;
      border-radius: 8px;
    }

    .option-btn:hover {
      border-color: var(--accent);
      background: rgba(108,138,255,0.08);
      border-radius: 8px;
    }

    .option-btn.selected {
      border-color: var(--accent);
      background: rgba(108,138,255,0.15);
      color: var(--vscode-editor-foreground);
      border-radius: 8px;
    }

    .option-btn .badge {
      display: block;
      font-family: 'Courier New', monospace;
      font-size: 15px;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 4px;
      border-radius: 8px;
      color: var(--text-accent);
    }

    .option-btn .label {
      font-size: 11px;
      color: var(--text-muted);
      border-radius: 8px;
    }

    .option-btn.selected .label {
      color: var(--text-muted);
      border-radius: 8px;
    }

    .sort-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .sort-btn {
      background: var(--surface2);
      border: 1.5px solid var(--border);
      border-radius: 8px;
      padding: 14px 12px;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
      color: var(--text);
      font-family: var(--font);
      box-sizing: border-box;
    }

    .sort-btn:hover { border-color: var(--accent); background: rgba(108,138,255,0.08); }
    .sort-btn.selected { border-color: var(--accent); background: rgba(108,138,255,0.15); }

    .sort-btn .icon { font-size: 18px; margin-bottom: 6px; display: block; border-radius: 8px;}
    .sort-btn .name { font-size: 13px; font-weight: 600; display: block; border-radius: 8px;color: var(--text-bold);}
    .sort-btn .desc { font-size: 11px; color: var(--text-muted); margin-top: 2px; display: block; border-radius: 8px;}

    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--surface2);
      border: 1.5px solid var(--border);
      border-radius: var(--radius);
      padding: 14px 16px;
      cursor: pointer;
      transition: border-color 0.15s;
      border-radius: 8px;
    }

    .toggle-row:hover { border-color: var(--accent);border-radius: 8px; }
    .toggle-row.active { border-color: #4d9ef5; border-radius: 8px;}

    .toggle-text .name { font-size: 13px; font-weight: 600; color: var(--text-bold);}
    .toggle-text .desc { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

    .toggle {
      width: 40px;
      height: 22px;
      background: var(--border);
      border-radius: 11px;
      position: relative;
      transition: background 0.2s;
      flex-shrink: 0;
    }

    .toggle::after {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      top: 3px;
      left: 3px;
      transition: transform 0.2s;
    }

    .toggle.on { background: #0078d4 ; }
    .toggle.on::after { transform: translateX(18px); }

    .actions {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 10px;
      margin-top: 28px;
    }

    .btn {
      padding: 12px;
      border-radius: var(--radius);
      font-family: var(--font);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
      border-radius: 8px;
    }

    .btn-cancel {
      background: var(--surface2);
      color: var(--text-muted);
      border: 1.5px solid var(--border);
      border-radius: 8px;
    }

    .btn-cancel:hover { border-color: var(--text-muted); color: var(--text); border-radius: 8px;}

    .btn-confirm {
      background: rgb(0, 120, 212) ;
      color: white;
      letter-spacing: 0.2px;
      border-radius: 8px;
    }

    .btn-confirm:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 16px;rgba(0, 120, 212, 0.4); border-radius: 8px;}
    .btn-confirm:active { transform: translateY(0); border-radius: 8px;}

    .preview {
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 22px;
      font-size: 12px;
      color: var(--text-muted);
    }

    .preview span {
      font-family: 'Courier New', monospace;
      color: var(--accent);
      font-size: 13px;
    }

    input[type="checkbox"]:checked {
      accent-color: #4d9ef5;
      color: white;
    }


  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <img src="${iconUri}" width="40" height="40" style="border-radius:10px; flex-shrink:0;" />
      <div>
        <h1>Auto File Sorter</h1>
        <div class="subtitle">${labels.subtitle}</div>
      </div>
    </div>

  <div class="sort-options" style="grid-template-columns: 1fr 1fr; gap:8px; margin-top:16px; margin-bottom:24px; width:100%;">
    <button class="sort-btn selected" id="tab-sort" style="width:100%; text-align:center; box-sizing:border-box;">${labels.tabSort}</button>
    <button class="sort-btn" id="tab-undo" style="width:100%; text-align:center; box-sizing:border-box;">${labels.tabUndo}</button>
  </div>

  
  <div id="page-sort">
    <div class="section">
      <div class="section-label">${labels.numberFormat}</div>
      <div class="options-grid cols-3">
        <button class="option-btn ${defaultFormat === "space" ? "selected" : ""}" data-format="space" >
          <span class="badge">00·</span>
          <span class="label">${labels.separatorSpace}</span>
        </button>
        <button class="option-btn ${defaultFormat === "dot" ? "selected" : ""}" data-format="dot" >
          <span class="badge">00.</span>
          <span class="label">${labels.separatorDot}</span>
        </button>
        <button class="option-btn ${defaultFormat === "underscore" ? "selected" : ""}" data-format="underscore" >
          <span class="badge">00_</span>
          <span class="label">${labels.separatorUnderscore}</span>
        </button>
      </div>
    </div>

    <div class="preview">
      ${labels.previewLabel}<span id="preview-text">00 document.docx</span>
    </div>

    <div class="section">
      <div class="section-label">${labels.sortMethod}</div>
      <div class="sort-options" id="sort-by-options">
        <button class="sort-btn ${defaultSortBy === "name" ? "selected" : ""}" data-sort="name" >
          <span class="name">${labels.sortByName}</span>
          <span class="desc">${labels.sortByAlphaNum}</span>
        </button>
        <button class="sort-btn ${defaultSortBy === "created" ? "selected" : ""}" data-sort="created" >
          <span class="name">${labels.sortByCreationTime}</span>
          <span class="desc">${labels.sortEarliestFirst}</span>
        </button>
      </div>
    </div>
    
    <div class="section">
      <div class="section-label">${labels.sortScope}</div>
      <div class="sort-options">
        <button class="sort-btn selected" id="scope-all" >
          <span class="name">${labels.scopeAllFiles}</span>
          <span class="desc">${labels.numberingUnified}</span>
        </button>
        <button class="sort-btn" id="scope-byType" >
          <span class="name">${labels.sortByFileType}</span>
          <span class="desc">${labels.numberingByType}</span>
        </button>
      </div>
      <div id="group-display-options" style="display:none; margin-top:8px;">
        <div class="section-label" style="margin-top:8px;">${labels.groupDisplay}</div>
        <div class="sort-options" id="group-display-btns">
          <button class="sort-btn selected" id="display-byType" >
            <span class="name">${labels.groupByType}</span>
            <span class="desc">00.txt 01.txt 00.py</span>
            <span class="desc" style="margin-top:4px; color:var(--vscode-descriptionForeground);">${labels.willset} explorer.sortOrder ${labels.to} type</span>
          </button>
          <button class="sort-btn" id="display-byIndex" >
            <span class="name">${labels.groupInterleave}</span>
            <span class="desc">00.txt 00.py 01.txt</span>
            <span class="desc" style="margin-top:4px; color:var(--vscode-descriptionForeground);">${labels.willset} explorer.sortOrder ${labels.to} default</span>
          </button>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-label">${labels.otherOptions}</div>
      <div class="toggle-row" id="remove-toggle" >
        <div class="toggle-text">
          <div class="name">${labels.replaceExistingNumbers}</div>
          <div class="desc">${labels.removeOldPrefixAndResort}</div>
        </div>
        <div class="toggle" id="toggle-knob"></div>
      </div>
      <div class="toggle-row" id="exclude-toggle" style="margin-top:32px;">
        <div class="toggle-text">
          <div class="name">${labels.excludeFilesLabel}</div>
          <div class="desc">${labels.excludeExpandHint}</div>
        </div>
        <div class="toggle" id="exclude-knob"></div>
      </div>
      <div id="exclude-panel" style="display:none; margin-top:8px;">
        <div style="display:flex; gap:8px; margin-bottom:8px;">
          <button class="sort-btn selected" id="exclude-tab-file" style="flex:1;">${labels.excludeByFile}</button>
          <button class="sort-btn" id="exclude-tab-ext" style="flex:1;">${labels.excludeByType}</button>
        </div>
        <div id="exclude-file-list" style="display:grid; grid-template-columns:1fr 1fr; gap:4px;"></div>
        <div id="exclude-ext-list" style="display:none; grid-template-columns:1fr 1fr; gap:4px;"></div>
      </div>
    </div>

    <div class="actions">
      <button class="btn btn-cancel" id="btn-cancel">${labels.cancelButton}</button>
      <button class="btn btn-confirm" id="btn-confirm">${labels.startSortButton}</button>
    </div>
  </div>

  <div id="page-undo" style="display:none; width:100%;">
    <div style="display:flex; flex-direction:column; gap:24px; padding-top:32px; width:100%;">
      <div style="font-size:13px; color:var(--text-muted);">${labels.formatMatchHint}</div>
      <button class="btn btn-confirm" id="btn-undo" style="width:100%;">${labels.undoDirect}</button>
      <div style="font-size:13px; color:var(--text-muted);">${labels.formatUnmatchHint}</div>
      <input id="undo-pattern-input" placeholder="${labels.regexInputPlaceholder}" style="width:100%; box-sizing:border-box;" />
      <div style="font-size:11px; color:var(--text-muted); margin-top:6px; line-height:1.6;">
        ${labels.regexHelp}
      </div>
      <button class="btn btn-confirm" id="btn-undo-confirm" style="width:100%;">${labels.undoConfirm}</button>
    </div>
  </div>
  
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const fileList = ${JSON.stringify(fileList)};

    let state = {
      format: '${defaultFormat}',
      sortBy: '${defaultSortBy}',
      removeExisting: false,
      scope: 'all',
      groupDisplay: 'byType',
      excludedFiles: [],
      excludedExts: []
    };

    const SAMPLE = 'document.docx';
    const SEP_MAP = { space: ' ', dot: '.', underscore: '_' };

    function updatePreview() {
      const sep = SEP_MAP[state.format];
      document.getElementById('preview-text').textContent = '00' + sep + SAMPLE;
    }

    function select(type, btn) {
      if (type === 'format') {
        document.querySelectorAll('[data-format]').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.format = btn.dataset.format;
        updatePreview();
      } else {
        document.querySelectorAll('[data-sort]').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.sortBy = btn.dataset.sort;
      }
    }

    function toggleRemove() {
      state.removeExisting = !state.removeExisting;
      const knob = document.getElementById('toggle-knob');
      const row = document.getElementById('remove-toggle');
      knob.classList.toggle('on', state.removeExisting);
      row.classList.toggle('active', state.removeExisting);
    }

    function cancel() {
      vscode.postMessage({ type: 'cancel' });
    }

    function confirm() {
      vscode.postMessage({ type: 'confirm', ...state });
    }

    function undo() {
      const customPattern = document.getElementById('undo-pattern-input')?.value?.trim() || '';
      vscode.postMessage({ type: 'undo', customPattern });
    }

    function toggleExclude(type, value, checked) {
      if (type === 'file') {
        if (checked) {
          if (!state.excludedFiles.includes(value)) {
            state.excludedFiles.push(value);
          }
        } else {
          state.excludedFiles = state.excludedFiles.filter(f => f !== value);
        }
      } else {
        if (checked) {
          if (!state.excludedExts.includes(value)) {
            state.excludedExts.push(value);
          }
        } else {
          state.excludedExts = state.excludedExts.filter(e => e !== value);
        }
      }
    }

    function renderExcludeLists() {
      const fileContainer = document.getElementById('exclude-file-list');
      const extContainer = document.getElementById('exclude-ext-list');
      document.getElementById('exclude-file-list').style.display = 'grid';
      document.getElementById('exclude-ext-list').style.display = 'none';

      fileContainer.innerHTML = fileList.map(f => 
        '<label style="display:flex; align-items:center; gap:8px; padding:6px 0; font-size:13px; cursor:pointer;">' +
        '<input type="checkbox" data-file="' + f.name + '">' +
        f.name +
        '</label>'
      ).join('');

      fileContainer.querySelectorAll('input[data-file]').forEach(function(input) {
        input.addEventListener('change', function() {
          toggleExclude('file', this.dataset.file, this.checked);
        });
      });

      const exts = [...new Set(fileList.map(f => f.ext))];
      extContainer.innerHTML = exts.map(e => 
        '<label style="display:flex; align-items:center; gap:8px; padding:6px 0; font-size:13px; cursor:pointer;">' +
        '<input type="checkbox" data-ext="' + e + '">' +
        (e === '__dir__' ? '${labels.folderLabel}' : e) +
        '</label>'
      ).join('');

      extContainer.querySelectorAll('input[data-ext]').forEach(function(input) {
        input.addEventListener('change', function() {
          toggleExclude('ext', this.dataset.ext, this.checked);
        });
      });
    }

    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('exclude-panel').style.display = 'none';
      document.getElementById('page-undo').style.display = 'none';
      document.getElementById('page-sort').style.display = 'block';
      document.getElementById('group-display-options').style.display = 'none';
      document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', function() { select('format', this); });
      });
      document.querySelectorAll('#sort-by-options .sort-btn').forEach(btn => {
        btn.addEventListener('click', function() { select('sort', this); });
      });
      document.getElementById('remove-toggle').addEventListener('click', toggleRemove);
      document.getElementById('btn-cancel').addEventListener('click', cancel);
      document.getElementById('btn-confirm').addEventListener('click', confirm);
      
      // ${labels.sortScope}按钮点击事件
      document.getElementById('scope-all').addEventListener('click', function() {
          state.scope = 'all'; // ← 这里改成 'all'
          this.classList.add('selected');
          document.getElementById('scope-byType').classList.remove('selected');
          document.getElementById('group-display-options').style.display = 'none';
      });

      document.getElementById('scope-byType').addEventListener('click', function() {
          state.scope = 'byType'; // ← 这里改成 'byType'
          this.classList.add('selected');
          document.getElementById('scope-all').classList.remove('selected');
          document.getElementById('group-display-options').style.display = 'grid';
      });

      document.getElementById('display-byType').addEventListener('click', function() {
        state.groupDisplay = 'byType';
        this.classList.add('selected');
        document.getElementById('display-byIndex').classList.remove('selected');
      });

      document.getElementById('display-byIndex').addEventListener('click', function() {
        state.groupDisplay = 'byIndex';
        this.classList.add('selected');
        document.getElementById('display-byType').classList.remove('selected');
      });

      // 排除文件展开
      let excludeOpen = false;
      document.getElementById('exclude-toggle').addEventListener('click', function() {
        excludeOpen = !excludeOpen;
        document.getElementById('exclude-knob').classList.toggle('on', excludeOpen);
        document.getElementById('exclude-panel').style.display = excludeOpen ? 'block' : 'none';
        if (excludeOpen) {
          renderExcludeLists();
          document.getElementById('exclude-file-list').style.display = 'grid';
          document.getElementById('exclude-ext-list').style.display = 'none';
          document.getElementById('exclude-tab-file').classList.add('selected');
          document.getElementById('exclude-tab-ext').classList.remove('selected');
        }
      });

      // 排除文件tab切换
      document.getElementById('exclude-tab-file').addEventListener('click', function() {
        document.getElementById('exclude-tab-file').classList.add('selected');
        document.getElementById('exclude-tab-ext').classList.remove('selected');
        document.getElementById('exclude-file-list').style.display = 'grid';
        document.getElementById('exclude-ext-list').style.display = 'none';
      });
      document.getElementById('exclude-tab-ext').addEventListener('click', function() {
        document.getElementById('exclude-tab-ext').classList.add('selected');
        document.getElementById('exclude-tab-file').classList.remove('selected');
        document.getElementById('exclude-file-list').style.display = 'none';
        document.getElementById('exclude-ext-list').style.display = 'grid';
      });

      // 撤销按钮
      document.getElementById('btn-undo').addEventListener('click', undo);
      document.getElementById('btn-undo-confirm').addEventListener('click', undo);

     document.getElementById('tab-sort').addEventListener('click', function() {
        document.getElementById('page-sort').style.display = 'block';
        document.getElementById('page-undo').style.display = 'none';
        document.getElementById('tab-sort').classList.add('selected');
        document.getElementById('tab-undo').classList.remove('selected');
      });
      document.getElementById('tab-undo').addEventListener('click', function() {
        document.getElementById('page-undo').style.display = 'block';
        document.getElementById('page-sort').style.display = 'none';
        document.getElementById('tab-undo').classList.add('selected');
        document.getElementById('tab-sort').classList.remove('selected');
      });
    updatePreview();
    });
  </script>
</body>
</html>`;
}
function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

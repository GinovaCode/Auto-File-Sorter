# Auto File Sorter

自动对文件夹内的文件按类型分组、顺序排列，并在文件名前加数字编号，提高文件管理效率。

---

## 功能一览

| 功能 | 说明 |
|------|------|
| 三种编号格式 | `00 文件名`、`00.文件名`、`00_文件名` |
| 自动位数 | ≤99 个文件用两位；100-999 用三位；>999 提示分文件夹 |
| 文件排序命名 | 根据排序范围和方式对文件进行排序命名 |
| 排序方式 | 按文件名（字母/数字）或按创建时间 |
| 替换已有编号 | 一键移除旧编号并重新排列 |
| 插入式自动重排 | 新建无编号文件时自动排序 |

---

## 使用方法

### 对单个文件夹排序

1. 在 VSCode 资源管理器中 **右键点击任意文件夹** → 选择 `对此文件夹排序编号`  
2. 弹窗中选择：
   - **编号格式**：空格 / 点号 / 下划线
   - **排序方式**：按文件名 / 按创建时间
   - **排序范围**：
     - 全部文件：忽略类型，统一编号
     - 文件类型：分组编号，可选择“按类型聚合”或“按序号交错”，按“类型聚合”会将文件夹内的文件按照文件类型划分和展示，“按序号交错”则会忽略文件类型，指按照序号展示。
   - **排除文件/类型**：可按文件或类型排除
3. 点击 **▶ 开始排序**

### 对整个工作区排序

- 打开命令面板（`Ctrl+Shift+P`）  
- 搜索 `对整个工作区排序编号`  

### 撤销排序

- 如果已有排序符合编号格式：点击**直接撤销**  
- 如果不符合：输入现有排序的正则表达式 → 确认撤销

---

## 编号逻辑示例

### 全部文件编号

| 原始文件 | 排序后（空格格式） |
|-----------|-----------------|
| 报告.docx | 00 报告.docx |
| 会议纪要.docx | 01 会议纪要.docx |
| 预算.xlsx | 02 预算.xlsx |
| 费用.xlsx | 03 费用.xlsx |

### 按文件类型分组

| 原始文件 | 排序后 |
|-----------|--------|
| 报告.docx | 00 报告.docx |
| 会议纪要.docx | 01 会议纪要.docx |
| 预算.xlsx | 00 预算.xlsx |
| 费用.xlsx | 01 费用.xlsx |


## 配置项（settings.json）

```json
{
  "autoFileSorter.watchForChanges": true,
  "autoFileSorter.defaultFormat": "space",
  "autoFileSorter.defaultSortBy": "name"
}
```


| 配置项 | 可选值 | 说明 |
|--------|--------|------|
| `watchForChanges` | `true / false` | 排序后是否持续监听文件变化 |
| `defaultFormat` | `space / dot / underscore` | 弹窗的默认编号格式 |
| `defaultSortBy` | `name / created` | 弹窗的默认排序方式 |

---

## 项目结构

```
auto-file-sorter/
├── src/
│   ├── extension.ts   # 插件入口，命令注册
│   ├── sorter.ts      # 核心排序 & 重命名逻辑
│   ├── watcher.ts     # 文件变化监听 & 插入式重排
│   └── webview.ts     # 配置弹窗 HTML/CSS/JS
├── package.json       # 插件清单
└── tsconfig.json
```

---
## 作者: Gina Wang    [GitHub](https://github.com/GinovaCode)

---

![demo](media/image_cn.png)

### [点击链接看看使用效果~]

(https://github.com/user-attachments/assets/356d77a8-6f74-4007-b392-7a68e7ecb109)
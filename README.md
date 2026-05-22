# Vault — 本地加密保险箱

> 完全离线的浏览器端文件加密工具。所有加密解密在本地完成，不上传任何数据。

## 特性

- **零信任架构** — 所有操作在浏览器本地完成，无服务器、无后端、无数据上传
- **AES-GCM 加密** — 文件内容使用随机密钥加密，密钥经 PBKDF2 派生后加密存储
- **双层加密模型** — 支持普通文件夹和加密文件夹混合使用
- **WebAuthn PRF** — 支持硬件安全密钥（如 YubiKey）派生主密钥
- **文件夹粒度加密** — 每个文件夹可独立设置密码，文件级随机密钥
- **纯文本编辑器** — 内置 CodeMirror，支持 14 种语言语法高亮
- **密码本** — 结构化密码/密钥管理
- **双模式搜索** — 文件夹名搜索 + 文件全局搜索（加密文件夹内文件名安全隐藏）
- **完全离线** — 仅使用 Web Crypto API + File System Access API，无需网络

## 快速开始

### 前提

- Chrome 或 Edge 浏览器（需支持 File System Access API）
- Node.js 18+

### 安装

```bash
npm install
```

### 开发

```bash
npm run dev
```

### 构建

```bash
npm run build
```

### 预览构建产物

```bash
npm run preview
```

## 使用说明

### 首次使用

1. 点击「打开保险箱」选择一个空目录作为保险箱存储位置
2. 设置解锁密码（建议使用高强度密码）
3. 可选：关联 WebAuthn 硬件安全密钥

### 文件夹管理

- **创建文件夹** — 侧栏右键或 `+` 按钮
- **加密文件夹** — 创建时可选加密，每个加密文件夹独立设置密码
- **文件夹类型切换** — 右键菜单「加密/解密文件夹」，自动批量转换内部文件

### 文件管理

- **导入文件** — 工具栏或右键菜单，支持拖拽
- **创建笔记** — 新建纯文本笔记，内置 CodeMirror 编辑器
- **创建密码条目** — 结构化保存网站/应用密码
- **移动文件** — 右键或批量选择后移动（跨加密/普通文件夹自动转换）
- **搜索** — 侧栏可按文件夹名或文件名全局搜索

### 安全提示

- 密码丢失无法找回 — 加密文件夹的密码不存储在服务器上
- 主密钥仅内存持有 — 任何情况下不写入磁盘
- 关闭标签页即自动锁定（需重新输入密码）

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 19 + TypeScript 5.7 |
| 构建 | Vite 6 + @vitejs/plugin-react |
| UI 组件 | antd v5 + @ant-design/icons v6 |
| 代码编辑器 | @uiw/react-codemirror（14 种语言） |
| 加密 | Web Crypto API（AES-GCM + PBKDF2） |
| 文件系统 | File System Access API |
| 持久化 | IndexedDB（最近文件夹、用户设置） |
| 身份认证 | WebAuthn PRF 扩展 |

## 架构

```
src/
├── types/          # 类型定义
├── crypto/         # Web Crypto API 封装
├── storage/        # 文件系统 + IndexedDB 持久化
├── auth/           # WebAuthn PRF 认证
├── context/        # 全局状态管理（useReducer + Context）
├── hooks/          # 通用 React Hooks
├── utils/          # 工具函数
└── components/     # UI 组件
    ├── ui/         # 通用基础组件
    ├── unlock/     # 解锁/锁定/文件夹选择
    ├── vault/      # 主界面（文件列表、侧栏、搜索）
    ├── preview/    # 文件预览
    ├── password/   # 密码本
    └── modals/     # 弹窗
```

详见 [AGENTS.md](./AGENTS.md)。

## 存储结构

```
保险箱目录/
├── .vault_meta/
│   ├── index.json        ← 明文索引（含加密文件元数据）
│   ├── salt              ← PBKDF2 盐值
│   └── credential_id     ← WebAuthn 凭证
├── plain/                 ← 普通文件（原文）
│   └── {uuid}.bin
└── data/                  ← 加密文件（AES-GCM）
    └── {uuid}.enc
```

## 安全设计

### 加密流程

1. 用户密码 → PBKDF2（600K 迭代）→ `masterKey`
2. 每个文件生成随机 `fileKey` → AES-GCM 加密文件内容
3. `fileKey` → 用 `masterKey` AES-GCM 加密 → 存入索引

### 约束

- 主密钥仅内存持有，永不落盘
- 所有加密操作使用 Web Crypto API（SubtleCrypto）
- 索引明文存储（不含文件内容），加速读写
- 禁止 `as any` / `@ts-ignore`

## 兼容性

仅支持 **Chrome** 和 **Edge** 浏览器，依赖：
- `showDirectoryPicker()`（File System Access API）
- `SubtleCrypto`（Web Crypto API）
- `WebAuthn` PRF 扩展（可选）

## License

MIT

# MCP Dashboard Clone

前端（React + TS + Vite + Ant Design）。复刻目标站菜单与页面骨架，并提供统一 Mock API，后端完成后可平滑切换。

## 开发

```bash
npm i
npm run dev
```

## 目录说明
- src/menu.config.tsx：侧栏菜单与多级路由的数据源
- src/api/mock.ts：统一 Mock API（dashboard、orders、materials、products 等）
- src/layouts/MainLayout.tsx：基础布局
- src/views/Workplace.tsx：工作台示例页

## 切换到真实后端
- 在 src/api/mock.ts 下替换实现或新增 real.ts 并在页面中切换导入
- 保持相同函数签名（返回 Promise；列表接口 { list, total }）以减少改动

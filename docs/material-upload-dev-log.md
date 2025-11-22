# 物料档案图片上传改造开发记录

## 背景
- 需求：物料档案新建/编辑时的图片上传需调用后端文件上传接口，拿到 URL 后在创建或更新接口中使用。
- 目标：抽象出通用图片上传组件，供物料档案及其他功能复用；全过程需记录调研/计划/开发/测试并保存在 docs 目录。

## 调研
### 前端现状
- `src/components/material/MaterialFormModal.tsx` 使用 Ant Design `Upload`，`beforeUpload` 直接将文件转成 base64，并把 base64 保存到 `imageUrl` 字段，通过 `materialApi` 传给后端。未与实际上传接口对接，无法复用。
- `src/api/material.ts` 中的 `create/update` 会把 `imageUrl` 原样写入请求体；当前 `imageUrl` 实际上传仍是 base64 占位。
- 项目中尚未发现对 `/api/v1/storage/files` 的调用，说明需要新建上传 API 封装。

### 后端能力
- `e-supply-back/src/main/java/com/atlas/esupply/api/document/FileStorageController.java` 暴露 `POST /api/v1/storage/files`，要求 multipart form-data，参数包含 `tenantId`、可选 `module`、文件体 `file`，返回 `objectKey/fileName/size/contentType/url`。
- `docs/storage/oss-integration.md` 说明了上传流程、模块字段、租户目录结构及签名下载 API，可直接复用于物料图片。
- 后端材质接口 (`/api/v1/materials`) 接收 `imageUrl`，因此只要上传接口返回 URL 并写入 `CreateMaterialPayload.imageUrl` 即可。

### 影响面
- 物料档案创建/编辑流程 (`src/views/MaterialArchive.tsx` + `MaterialFormModal`)。
- 需要一个新的上传 API（如 `src/api/storage.ts`）和通用上传组件（位于 `src/components/upload`）。
- 后续可能扩展到其他页面，因此组件需支持模块名、初始值、受控状态、限制等配置。

📌 调研结论：前端需新增调用 `/api/v1/storage/files` 的 API、通用上传组件，并在 `MaterialFormModal` 中替换 base64 逻辑，确保依赖 `tenantStore` 传 tenantId。后端已具备能力，无需改动。

## 计划
1. 编写 `storageApi.upload`，构建 multipart 请求并复用 `tenantStore` 提供的租户 ID，同时输出上传结果类型。
2. 基于 `Upload` 封装通用组件（暂命名 `ImageUploader`），负责调 `storageApi.upload`、控制文件列表、暴露受控 `value/onChange`、支持 `module/maxSize/tips` 等配置。
3. 在 `MaterialFormModal` 中替换原先 base64 逻辑，使用 `ImageUploader`，并确保表单取值/预览/清除逻辑与通用组件一致。
4. 补充本记录文档中的“开发”“测试”部分，描述关键实现和验证结果。

## 开发
1. 新增 `src/api/storage.ts`，将 `/api/v1/storage/files` 封装为 `storageApi.upload`，内部负责拼接 `tenantId/module`，并输出标准 `FileUploadResult`。
2. 在 `src/components/upload/ImageUploader.tsx` 实现通用上传组件：集成 AntD `Upload`、自定义 `customRequest` 调用 `storageApi.upload`，支持尺寸限制、预览、删除与受控 `value`。
3. `src/components/material/MaterialFormModal.tsx` 中移除 base64 逻辑，改用 `<ImageUploader module="materials" />`，表单直接接收文件上传得到的 URL。

## 测试
- `npm run lint`：通过，确认新增 TS/React 代码符合规范。
- 真机上传联调依赖 OSS/后端接口，当前环境未跑后端，需上线前在联调环境点击「新建物料」上传真实图片验证 URL 写入是否成功。

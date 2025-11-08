
---

## Backend Skeleton Alignment（2024-xx-xx）

- 已在 `~/codes/supply-and-sale/e-supply-back` 初始化 Spring Boot 工程，按上文域模型创建 JPA 实体与 REST skeleton，确保实体字段与前端契约映射一致。
- 主体依赖：Spring Boot 3.2、Spring Data JPA、Spring Security、Flyway；`application.yml` 预置 MySQL 连接占位，Flyway `V1__baseline_schema.sql` 等待具体 DDL。
- 控制器示例：`/api/v1/sample-orders`、`/api/v1/partners`、`/api/v1/production-orders`、`/api/v1/inventory/transactions`、`/api/v1/outsourcing/orders`、`/api/v1/cash-accounts`、`/api/v1/settings/users` 等，与文档中的 API 路由保持一致，后续按模块补完服务逻辑与权限校验。
- 下一步请基于该工程补充 Flyway 表结构、聚合查询、权限拦截（RBAC）和审计日志落库逻辑，并补充 Testcontainers 集成测试保障主要流程。

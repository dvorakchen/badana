---
name: search
description: 数据查询与展示技能，使用 query_database 执行查询并以 Markdown 表格美化输出
---

## 可用工具

- query_database — 执行任意 SELECT 查询（包括查询数据库 schema）

**调用格式**：
`query_database` **只有一个参数 `query`**，不要传 `params` 或其他字段：

```json
{ "query": "SELECT ..." }
```

**常见错误**：不要写成 `{"query": "...", "params": []}`，`params` 字段不存在，会导致调用失败。

## 工作流程

1. **确定查询目标**：分析用户的查询需求。
2. **谨慎查询结构（可选）**：如果你不确定表结构，可以通过 pg_catalog 了解（但**禁止在同一个对话中反复查询相同的表结构**）：
   - 列出所有表及其注释：
     ```sql
     SELECT c.relname AS table_name,
            obj_description(c.oid, 'pg_class') AS description
     FROM pg_catalog.pg_class c
     JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r'
     ORDER BY c.relname
     ```
   - 查看某表字段及其注释（替换 {表名}）：
     ```sql
     SELECT a.attname AS column_name,
            pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
            a.attnotnull,
            d.description
     FROM pg_catalog.pg_class c
     JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
     LEFT JOIN pg_catalog.pg_description d ON d.objoid = c.oid AND d.objsubid = a.attnum
     WHERE c.relname = '{表名}' AND a.attnum > 0 AND NOT a.attisdropped
     ORDER BY a.attnum
     ```
3. **编写 SQL**：根据表名和字段名编写 SELECT 查询。
4. **防无限循环策略（核心指令）**：
   - 每次调用 `query_database` 前，必须仔细检查 SQL。
   - **如果查询报错，最多允许进行 1 次修正和重试**。
   - **如果第 2 次执行依然报错，必须立即停止调用该工具**，将报错信息原样抛给用户，并请求用户协助核对表结构或需求。
   - **绝对禁止无限循环地调用 `query_database` 尝试修复错误！**

## 输出格式要求（重要）

查询结果**必须用 Markdown 表格**展示，不允许输出原始文本格式。

表格规范：

- 表头使用中文（将英文字段名翻译成可读的中文名）
- **不要展示内部 ID 列**（如 `id`、`user_id`、`role_id`、`team_id` 等），除非用户明确要求查看
- 如果结果为空，输出「查询结果为空」并建议用户调整条件
- 如果结果超过 20 行，在表格下方注明「共 N 条记录，仅展示前 20 条」
- 涉及时间的字段，格式化为 `YYYY-MM-DD HH:mm`

示例输出格式：

| 用户名 | 邮箱              | 角色   | 创建时间         |
| ------ | ----------------- | ------ | ---------------- |
| 张三   | zhang@example.com | 管理员 | 2025-01-15 09:30 |
| 李四   | li@example.com    | 员工   | 2025-03-22 14:00 |

## 注意事项

- 只允许 SELECT 查询，不可执行 INSERT/UPDATE/DELETE
- query_database 自动限制最多 50 条，若用户需要更多数据，提示缩小查询范围
- 涉及用户敏感信息（如邮箱、手机号）时，仅展示用户明确要求查询的字段

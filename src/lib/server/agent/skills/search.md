---
name: search
description: 数据查询与展示技能，使用 query_database 执行查询并以 Markdown 表格美化输出
---

## 可用工具

- query_database — 执行任意 SELECT 查询（包括查询数据库 schema）

## 工作流程

1. **先查结构**：用户描述查询需求后，先通过 pg_catalog 了解数据库结构：
   - 列出所有表：
     ```sql
     SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'
     ```
   - 查看某表字段（替换 {表名}）：
     ```sql
     SELECT a.attname AS column_name,
            pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
            a.attnotnull
     FROM pg_catalog.pg_class c
     JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
     WHERE c.relname = '{表名}' AND a.attnum > 0 AND NOT a.attisdropped
     ORDER BY a.attnum
     ```
2. **编写 SQL**：确认表名和字段后，编写 SELECT 查询，只查必要的字段。
3. **执行查询**：调用 \`query_database\` 执行 SQL。

## 输出格式要求（重要）

查询结果**必须用 Markdown 表格**展示，不允许输出原始文本格式。

表格规范：

- 表头使用中文（将英文字段名翻译成可读的中文名）
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

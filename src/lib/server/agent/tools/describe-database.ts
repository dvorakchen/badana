/**
 * 数据库结构描述工具 - 向 AI 披露 public schema 下所有表名和字段
 *
 * 使用 pg_catalog 而非 information_schema，因为 information_schema 受权限过滤，
 * 只读 agent 用户可能看不到任何表。pg_catalog 无此限制。
 */
import type { ToolEntry } from '../tool-registry';
import { sql } from 'drizzle-orm';

export const describeDatabase: ToolEntry = {
	name: 'describe_database',
	definition: {
		type: 'function',
		function: {
			name: 'describe_database',
			description:
				'获取数据库的所有表结构信息，包括表名、字段名、字段类型。在使用 query_database 编写 SQL 之前，应先调用此工具了解表名和字段名。',
			parameters: { type: 'object', properties: {} }
		}
	},
	execute: async (_args, ctx) => {
		try {
			const rows = await ctx.db.execute(sql`
				SELECT
					c.relname AS table_name,
					a.attname AS column_name,
					pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
					a.attnotnull AS not_null
				FROM pg_catalog.pg_class c
				JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
				JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
				WHERE n.nspname = 'public'
					AND c.relkind = 'r'
					AND a.attnum > 0
					AND NOT a.attisdropped
				ORDER BY c.relname, a.attnum
			`);

			if (!Array.isArray(rows) || rows.length === 0) {
				return '(未找到 public schema 下的任何表)';
			}

			// 按表名分组
			const tables = new Map<string, string[]>();
			for (const r of rows) {
				const t = r.table_name as string;
				const nullable = r.not_null ? '' : '?';
				const col = `${r.column_name}: ${r.data_type}${nullable}`;
				if (!tables.has(t)) tables.set(t, []);
				tables.get(t)!.push(col);
			}

			const lines: string[] = [];
			for (const [table, cols] of tables) {
				lines.push(`${table} (${cols.join(', ')})`);
			}

			return `数据库包含以下 ${tables.size} 张表:\n${lines.join('\n')}`;
		} catch (err) {
			return `获取数据库结构失败: ${(err as Error).message}`;
		}
	},
	searchKeywords: [
		'schema',
		'结构',
		'表结构',
		'字段',
		'table',
		'describe',
		'数据库结构',
		'表名',
		'有哪些表',
		'列名'
	],
	tags: ['base', 'utility'],

	category: 'database'
};

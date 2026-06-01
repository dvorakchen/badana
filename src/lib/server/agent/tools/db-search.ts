/**
 * 数据库查询工具 - 允许 AI 执行只读 SQL 查询
 *
 * 安全措施:
 * 1. 只允许 SELECT 语句
 * 2. 自动追加 LIMIT 50（若无 LIMIT）
 * 3. 数据库层面使用只读用户（AGENT_DATABASE_URL），无法执行写操作
 */
import type { ToolEntry } from '../tool-registry';
import { sql } from 'drizzle-orm';

const MAX_ROWS = 50;

export const searchDb: ToolEntry = {
	name: 'query_database',
	definition: {
		type: 'function',
		function: {
			name: 'query_database',
			description:
				'执行只读 SQL 查询，获取数据库中的信息。可用于查询任何数据。只能使用 SELECT 语句。',
			parameters: {
				type: 'object',
				properties: {
					query: {
						type: 'string',
						description:
							'[参数名: query] 要执行的 SELECT 查询，例如 {"query": "SELECT * FROM "user""}'
					}
				},
				required: ['query']
			}
		}
	},
	isDisplay: true,
	execute: async (args, ctx) => {
		const rawQuery = ((args.query ?? args.sql ?? args.statement ?? args.q) as string)?.trim();

		if (!rawQuery) {
			return '错误: 请提供 query 参数，例如 {"query": "SELECT * FROM \\"user\\""}';
		}

		// 只允许 SELECT 语句
		const normalized = rawQuery.toUpperCase().replace(/\s+/g, ' ').trim();
		if (!normalized.startsWith('SELECT')) {
			return '错误: 只允许执行 SELECT 查询。';
		}

		// 禁止分号分隔的多语句（防止 SQL 注入绕过）
		if (rawQuery.includes(';')) {
			// 允许结尾分号
			if (rawQuery.indexOf(';') !== rawQuery.length - 1) {
				return '错误: 不支持多语句查询。';
			}
		}

		// 自动追加 LIMIT（如果查询未指定）
		let query = rawQuery.replace(/;+$/, '').trim();
		if (!normalized.includes('LIMIT')) {
			query = `${query} LIMIT ${MAX_ROWS}`;
		}

		try {
			const result = await ctx.db.execute(sql.raw(query));
			const rows = (result as { rows?: unknown[] }).rows ?? result;

			if (!Array.isArray(rows) || rows.length === 0) {
				return '(查询结果为空)';
			}

			const formatted = rows.map((row, i) => {
				const record = row as Record<string, unknown>;
				const fields = Object.entries(record)
					.map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
					.join(', ');
				return `[${i + 1}] ${fields}`;
			});

			return `查询返回 ${rows.length} 条记录:\n${formatted.join('\n')}`;
		} catch (err) {
			return `数据库查询出错: ${(err as Error).message}`;
		}
	},
	base: true
};

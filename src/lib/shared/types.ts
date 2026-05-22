import type { auth } from '$lib/server/auth';
import { type InferSelectModel } from 'drizzle-orm';
import type * as schema from '$lib/server/db/schema';

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;

export type Role = InferSelectModel<typeof schema.role>;
export type Team = InferSelectModel<typeof schema.team>;

export type TeamWithManager = Team & {
	manager: User | null;
	memberCount: number;
};

export interface PaginationResult<T> {
	list: T[];
	pagination: {
		page: number;
		pageSize: number;
		total: number;
		totalPages: number;
	};
}

/**
 * 数据库里有些字段需要 i18n 显示，就会存这个 JSON 类型
 *
 * # Example
 *
 * ```json
 * {
 * 		default: "中文",
 * 		zh: "中文",
 * 		en: "English"
 * }
 * ```
 */
export type DbI18nField =
	| {
			/**
			 * 当没有区域指定的文本时候，默认显示这个文本
			 */
			default: string;
			/**
			 * 区域文本
			 *
			 * zh: 中文
			 * en: English
			 */
			[K: string]: string;
	  }
	| { [K: string]: string };

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

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.ADMIN_DATABASE_URL) throw new Error('ADMIN_DATABASE_URL is not set');

const client = postgres(env.ADMIN_DATABASE_URL);

/**
 * 要使用数据据库连接实例，请通过 DbService 类的 db 属性访问！
 * 当前示例在 berrer-auth 初始化和 seed.ts 中使用了这个连接实例。
 */
export const db = drizzle(client, { schema });

/**
 * 数据库服务类，提供对数据库连接实例的访问
 */
export interface DbService<T = typeof db> {
	get db(): T;
}

/**
 * 普通数据库链接
 */
export class NormalDbService implements DbService {
	/**
	 * 数据库连接实例，使用 Drizzle ORM 进行数据库操作。这个实例是全局单例的，可以在整个应用中共享。
	 */
	get db() {
		return db;
	}
}

/**
 * 给 Agent 使用的数据库链接，有更严格的权限控制
 */
export class AiDbService implements DbService {
	/**
	 * 数据库连接实例，使用 Drizzle ORM 进行数据库操作。这个实例是全局单例的，可以在整个应用中共享。
	 */
	get db() {
		if (!env.AGENT_DATABASE_URL) throw new Error('AGENT_DATABASE_URL is not set');
		const client = postgres(env.AGENT_DATABASE_URL);
		const db = drizzle(client, { schema });

		return db;
	}
}

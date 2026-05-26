import { db } from '$lib/server/db';
import { env } from '$env/dynamic/private';
import { logger } from '$lib/server/logger';
import * as schema from './schema';
import { eq, sql } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import type { DbI18nField } from '$lib/shared';
import {
	PERMISSIONS,
	ROLE_ADMIN_NAME,
	USER_ADMIN_DISPLAYUSERNAME,
	USER_ADMIN_USERNAME
} from '$lib/shared';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

/**
 * 执行数据库迁移
 */
export async function runMigrations() {
	try {
		logger.info('⏳ Running database migrations...');
		await migrate(db, { migrationsFolder: 'drizzle' });
		logger.info('✅ Database migrations completed.');
	} catch (error) {
		if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
			logger.warn('⚠️ Database connection refused during migrations. Skipping...');
		} else {
			logger.error(error, '❌ Database migrations failed');
			// 在开发环境下不抛出错误，避免进程崩溃
			if (process.env.NODE_ENV === 'production') throw error;
		}
	}
}

/**
 * 为数据库表和字段添加注释（COMMENT ON TABLE / COMMENT ON COLUMN）。
 * 注释存储在 pg_catalog.pg_description 中，AI 通过 pg_catalog 查询表结构时
 * 可以看到这些注释，从而理解每张表和每个字段的业务含义，无需猜测。
 */
async function addComments() {
	const comments: { table: string; comment?: string; columns?: Record<string, string> }[] = [
		{
			table: 'user',
			comment: '系统用户表，存储所有用户基本信息',
			columns: {
				id: '用户唯一标识',
				name: '用户姓名',
				email: '登录邮箱，唯一',
				email_verified: '邮箱是否已验证',
				image: '用户头像 URL',
				created_at: '创建时间',
				updated_at: '最后更新时间',
				username: '用户名，用于登录和系统内显示',
				display_username: '展示用户名',
				phone_number: '手机号，唯一',
				phone_number_verified: '手机号是否已验证',
				banned: '是否已被封禁',
				ban_reason: '封禁原因',
				ban_expires: '封禁过期时间',
				removed: '是否已离职/注销'
			}
		},
		{
			table: 'role',
			comment: '角色表，定义角色及其权限集合（RBAC）',
			columns: {
				id: '角色唯一标识',
				name: '角色名称（多语言 JSON）',
				permissions: '角色拥有的权限列表（字符串数组）',
				created_at: '创建时间',
				updated_at: '最后更新时间'
			}
		},
		{
			table: 'user_role',
			comment: '用户-角色关联表，多对多关系',
			columns: {
				id: '关联记录唯一标识',
				user_id: '用户 ID，关联 user 表',
				role_id: '角色 ID，关联 role 表',
				created_at: '分配时间'
			}
		},
		{
			table: 'team',
			comment: '团队表，存储组织架构中的团队信息',
			columns: {
				id: '团队唯一标识',
				name: '团队名称（多语言 JSON）',
				manager_id: '团队负责人 ID，关联 user 表',
				created_at: '创建时间',
				updated_at: '最后更新时间'
			}
		},
		{
			table: 'team_user',
			comment: '团队-用户关联表，多对多关系，等同于部门',
			columns: {
				id: '关联记录唯一标识',
				team_id: '团队 ID，关联 team 表',
				user_id: '用户 ID，关联 user 表',
				created_at: '加入时间'
			}
		},
		{
			table: 'task',
			comment: '任务表（示例/测试用）',
			columns: {
				id: '任务唯一标识',
				title: '任务标题',
				priority: '优先级，数字越大越高'
			}
		}
	];

	try {
		for (const { table, comment, columns } of comments) {
			if (comment) {
				await db.execute(
					sql.raw(`COMMENT ON TABLE "${table}" IS '${comment.replace(/'/g, "''")}'`)
				);
			}
			if (columns) {
				for (const [col, desc] of Object.entries(columns)) {
					await db.execute(
						sql.raw(`COMMENT ON COLUMN "${table}"."${col}" IS '${desc.replace(/'/g, "''")}'`)
					);
				}
			}
		}
		logger.info('✅ Database comments added.');
	} catch (error) {
		logger.warn(error, '⚠️ Failed to add database comments. Skipping...');
	}
}

export async function seed() {
	try {
		logger.info('⏳ Seeding database...');

		if (env.AGENT_DATABASE_URL) {
			try {
				const agentUrl = new URL(env.AGENT_DATABASE_URL);
				const agentUser = agentUrl.username;
				const agentPass = agentUrl.password;
				// 创建给 agent 使用的数据库链接，只有查询权限
				if (agentUser) {
					const checkRole = await db.execute(
						sql`SELECT 1 FROM pg_roles WHERE rolname = ${agentUser}`
					);
					if (checkRole.length === 0) {
						logger.info(`⏳ Creating database read-only user: ${agentUser}...`);
						await db.execute(
							sql.raw(`CREATE ROLE ${agentUser} WITH LOGIN PASSWORD '${agentPass}'`)
						);
						await db.execute(sql.raw(`GRANT USAGE ON SCHEMA public TO ${agentUser}`));
						await db.execute(
							sql.raw(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${agentUser}`)
						);
						await db.execute(
							sql.raw(
								`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ${agentUser}`
							)
						);
						logger.info(`✅ Database read-only user created: ${agentUser}`);
					} else {
						logger.info(`ℹ️ Database user already exists: ${agentUser}`);
					}
				}
			} catch (e) {
				logger.warn(e, '⚠️ Failed to create agent database user. Skipping...');
			}
		}

		// 检查数据库是否可连接
		await db.execute(sql`SELECT 1`);
	} catch (error) {
		logger.warn(error, '⚠️ Database not ready for seeding. Skipping...');
		return;
	}

	await addComments();

	if (await db.query.user.findFirst()) {
		logger.info('ℹ️ Users already exist. Skipping seeding.');
		return;
	}

	const password = '123123123';

	// 1. 定义权限集合
	const allPermissions = [
		PERMISSIONS.team.read,
		PERMISSIONS.team.create,
		PERMISSIONS.team.update,
		PERMISSIONS.team.delete,
		PERMISSIONS.employee.read,
		PERMISSIONS.employee.create,
		PERMISSIONS.employee.update,
		PERMISSIONS.employee.delete,
		PERMISSIONS.employee.ban,
		PERMISSIONS.employee.resign,
		PERMISSIONS.role.read,
		PERMISSIONS.role.create,
		PERMISSIONS.role.update,
		PERMISSIONS.role.delete
	];

	// 2. 定义角色及其配置
	const rolesConfig: Record<string, { name: DbI18nField; permissions: string[] }> = {
		admin: {
			name: { default: ROLE_ADMIN_NAME, zh: ROLE_ADMIN_NAME, en: 'System Admin' },
			permissions: allPermissions
		},
		boss: {
			name: { default: '老板', zh: '老板', en: 'Boss' },
			permissions: allPermissions
		},
		manager: {
			name: { default: '部门经理', zh: '部门经理', en: 'Manager' },
			permissions: [
				PERMISSIONS.team.read,
				PERMISSIONS.team.update,
				PERMISSIONS.employee.read,
				PERMISSIONS.employee.update,
				PERMISSIONS.role.read
			]
		},
		dev: {
			name: { default: '开发者', zh: '开发者', en: 'Developer' },
			permissions: allPermissions
		},
		employee: {
			name: { default: '普通员工', zh: '普通员工', en: 'Employee' },
			permissions: [PERMISSIONS.team.read, PERMISSIONS.employee.read]
		}
	};

	// 3. 创建角色并建立映射
	const roleIdMap: Record<string, string> = {};
	for (const [key, config] of Object.entries(rolesConfig)) {
		const existing = await db.query.role.findFirst({
			where: (table, { sql }) => sql`${table.name}->>'en' = ${config.name.en}`
		});

		if (existing) {
			roleIdMap[key] = existing.id;
			logger.info(`ℹ️ Role already exists: ${config.name.zh}`);
		} else {
			const [inserted] = await db
				.insert(schema.role)
				.values({
					name: config.name,
					permissions: config.permissions
				})
				.returning();
			roleIdMap[key] = inserted.id;
			logger.info(`✅ Role created: ${config.name.zh}`);
		}
	}

	// 4. 定义用户数据
	const usersToSeed = [
		{
			email: 'admin@qq.com',
			username: USER_ADMIN_USERNAME,
			displayUsername: USER_ADMIN_DISPLAYUSERNAME,
			phoneNumber: '13800138000',
			roles: ['admin', 'employee']
		},
		{
			email: 'laoban@example.com',
			username: 'laoban',
			displayUsername: '老板',
			phoneNumber: '13800138001',
			roles: ['boss', 'employee']
		},
		{
			email: 'zhangsan@example.com',
			username: 'zhangsan',
			displayUsername: '张三',
			phoneNumber: '13800138002',
			roles: ['manager', 'employee']
		},
		{
			email: 'lisi@example.com',
			username: 'lisi',
			displayUsername: '李四',
			phoneNumber: '13800138003',
			roles: ['manager', 'employee']
		},
		{
			email: 'wangwu@example.com',
			username: 'wangwu',
			displayUsername: '王五',
			phoneNumber: '13800138004',
			roles: ['manager', 'employee']
		},
		{
			email: 'zhaoliu@example.com',
			username: 'zhaoliu',
			displayUsername: '赵六',
			phoneNumber: '13800138005',
			roles: ['manager', 'employee']
		},
		{
			email: 'dev@example.com',
			username: 'dev',
			displayUsername: '开发人员',
			phoneNumber: '13800138006',
			roles: ['dev', 'employee']
		},
		{
			email: 'emp1@example.com',
			username: 'emp1',
			displayUsername: '员工甲',
			phoneNumber: '13800138007',
			roles: ['employee']
		},
		{
			email: 'emp2@example.com',
			username: 'emp2',
			displayUsername: '员工乙',
			phoneNumber: '13800138008',
			roles: ['employee']
		},
		{
			email: 'emp3@example.com',
			username: 'emp3',
			displayUsername: '员工丙',
			phoneNumber: '13800138009',
			roles: ['employee']
		},
		{
			email: 'emp4@example.com',
			username: 'emp4',
			displayUsername: '员工丁',
			phoneNumber: '13800138010',
			roles: ['employee']
		}
	];

	const userMap: Record<string, string> = {};

	// 5. 创建用户并分配角色
	for (const u of usersToSeed) {
		let userId: string;
		const existing = await db.query.user.findFirst({
			where: eq(schema.user.email, u.email)
		});

		if (!existing) {
			const result = await auth.api.signUpEmail({
				body: {
					email: u.email,
					password,
					name: u.displayUsername,
					username: u.username,
					displayUsername: u.displayUsername
				}
			});
			userId = result.user.id;
			await db
				.update(schema.user)
				.set({ phoneNumber: u.phoneNumber })
				.where(eq(schema.user.id, userId));
			logger.info(`✅ User created: ${u.displayUsername}`);
		} else {
			userId = existing.id;
			if (!existing.phoneNumber) {
				await db
					.update(schema.user)
					.set({ phoneNumber: u.phoneNumber })
					.where(eq(schema.user.id, userId));
				logger.info(`✅ User phone updated: ${u.displayUsername}`);
			}
			logger.info(`ℹ️ User already exists: ${u.displayUsername}`);
		}
		userMap[u.username] = userId;

		if (existing) {
			continue;
		}
		// 分配角色
		for (const roleKey of u.roles) {
			const roleId = roleIdMap[roleKey];
			const existingUserRole = await db.query.userRole.findFirst({
				where: (table, { and, eq }) => and(eq(table.userId, userId), eq(table.roleId, roleId))
			});

			if (!existingUserRole) {
				await db.insert(schema.userRole).values({
					userId,
					roleId
				});
			}
		}
	}

	// 6. 定义并创建团队
	const teamsToSeed = [
		{
			key: 'rd',
			name: { default: '研发部', zh: '研发部', en: 'Research & Development' },
			manager: 'dev',
			members: ['dev', 'emp1', 'emp2']
		},
		{
			key: 'marketing',
			name: { default: '市场部', zh: '市场部', en: 'Marketing' },
			manager: 'laoban',
			members: ['laoban', 'emp3', 'emp4']
		},
		{
			key: 'management',
			name: { default: '管理部', zh: '管理部', en: 'Management' },
			manager: 'admin',
			members: ['admin', 'zhangsan', 'lisi', 'wangwu', 'zhaoliu']
		}
	];

	for (const t of teamsToSeed) {
		let teamId: string;
		const existingTeam = await db.query.team.findFirst({
			where: (table, { sql }) => sql`${table.name}->>'en' = ${t.name.en}`
		});

		if (existingTeam) {
			teamId = existingTeam.id;
			logger.info(`ℹ️ Team already exists: ${t.name.zh}`);
		} else {
			const [inserted] = await db
				.insert(schema.team)
				.values({
					name: t.name,
					managerId: userMap[t.manager]
				})
				.returning();
			teamId = inserted.id;
			logger.info(`✅ Team created: ${t.name.zh}`);
		}

		// 添加团队成员
		for (const memberUsername of t.members) {
			const userId = userMap[memberUsername];
			const existingTeamUser = await db.query.teamUser.findFirst({
				where: (table, { and, eq }) => and(eq(table.teamId, teamId), eq(table.userId, userId))
			});

			if (!existingTeamUser) {
				await db.insert(schema.teamUser).values({
					teamId,
					userId
				});
			}
		}
	}

	logger.info('🚀 Seeding process finished!');
}

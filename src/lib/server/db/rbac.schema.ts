import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, index, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

/**
 * 角色表 role
 * # 字段
 * 
 * name 是一个 text 类型
 * permission 是一个字符串数组
 * createdAt: timestampz("created_at").defaultNow().notNull(),
   updatedAt: timestampz("updated_at")
 */
export const role = pgTable('role', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	permissions: text('permissions').array().notNull().default([]),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

/**
 * 用户和角色关联表 user_role
 * # 字段
 *
 * id
 * user_id
 * role_id
 * createdAt: timestampz("created_at").defaultNow().notNull(),
 *
 */
export const userRole = pgTable(
	'user_role',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		roleId: uuid('role_id')
			.notNull()
			.references(() => role.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		index('user_role_userId_idx').on(table.userId),
		index('user_role_roleId_idx').on(table.roleId)
	]
);

/**
 * 团队表 team
 * 
 * name 字符串类型
 * manager_id 负责人 id，用户 id
 * createdAt: timestampz("created_at").defaultNow().notNull(),
   updatedAt: timestampz("updated_at")
 */
export const team = pgTable('team', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	managerId: text('manager_id').references(() => user.id, { onDelete: 'set null' }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

/**
 * 用户和团队关联表 team_user
 *
 * team_id
 * user_id
 * createdAt: timestampz("created_at").defaultNow().notNull(),
 */
export const teamUser = pgTable(
	'team_user',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		teamId: uuid('team_id')
			.notNull()
			.references(() => team.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [
		index('team_user_teamId_idx').on(table.teamId),
		index('team_user_userId_idx').on(table.userId)
	]
);

// Relations
export const roleRelations = relations(role, ({ many }) => ({
	userRoles: many(userRole)
}));

export const userRoleRelations = relations(userRole, ({ one }) => ({
	user: one(user, {
		fields: [userRole.userId],
		references: [user.id]
	}),
	role: one(role, {
		fields: [userRole.roleId],
		references: [role.id]
	})
}));

export const teamRelations = relations(team, ({ one, many }) => ({
	manager: one(user, {
		fields: [team.managerId],
		references: [user.id]
	}),
	teamUsers: many(teamUser)
}));

export const teamUserRelations = relations(teamUser, ({ one }) => ({
	team: one(team, {
		fields: [teamUser.teamId],
		references: [team.id]
	}),
	user: one(user, {
		fields: [teamUser.userId],
		references: [user.id]
	})
}));

export const userRbacRelations = relations(user, ({ many }) => ({
	userRoles: many(userRole),
	teamUsers: many(teamUser),
	managedTeams: many(team)
}));

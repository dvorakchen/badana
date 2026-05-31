import type { DbService } from '$lib/server/db';
import { role, user, userRole } from '$lib/server/db/schema';
import type { Role } from '$lib/shared';
import { eq, count, and } from 'drizzle-orm';
import { inject, injectable } from 'tsyringe';

export type RoleWithUserCount = Role & {
	userCount: number;
};

@injectable()
export class RoleService {
	constructor(@inject('NormalDbService') private dbService: DbService) {}

	private get db() {
		return this.dbService.db;
	}

	/**
	 * 获取用户拥有的所有角色
	 * @param userId 用户 ID
	 */
	async getRolesByUser(userId: string): Promise<Role[]> {
		const result = await this.db.query.userRole.findMany({
			where: eq(userRole.userId, userId),
			with: {
				role: true
			}
		});

		return result.map((ur) => ur.role);
	}

	/**
	 * 获取列表角色
	 */
	async getRoles(): Promise<Role[]> {
		const result = await this.db.query.role.findMany();
		return result;
	}

	/**
	 * 获取角色列表及关联的在职员工数量
	 */
	async getRolesWithUserCount(): Promise<RoleWithUserCount[]> {
		const result = await this.db
			.select({
				role: role,
				userCount: count(user.id)
			})
			.from(role)
			.leftJoin(userRole, eq(role.id, userRole.roleId))
			.leftJoin(user, and(eq(userRole.userId, user.id), eq(user.removed, false)))
			.groupBy(role.id)
			.execute();

		return result.map((r) => ({
			...r.role,
			userCount: r.userCount
		}));
	}

	/**
	 * 根据 ID 获取角色
	 */
	async getRoleById(id: string): Promise<Role | null> {
		const result = await this.db.query.role.findFirst({
			where: eq(role.id, id)
		});
		return result ?? null;
	}

	/**
	 * 检查角色名是否已存在
	 */
	async isRoleNameTaken(name: string): Promise<boolean> {
		const existing = await this.db.query.role.findFirst({
			where: (table, { eq }) => eq(table.name, name)
		});
		return !!existing;
	}

	/**
	 * 创建新角色
	 */
	async createRole(data: { name: string; permissions: string[] }) {
		const [inserted] = await this.db.insert(role).values(data).returning();
		return inserted;
	}

	/**
	 * 更新角色信息
	 */
	async updateRole(id: string, data: { name?: string; permissions?: string[] }) {
		await this.db.update(role).set(data).where(eq(role.id, id)).execute();
	}

	/**
	 * 删除角色
	 */
	async deleteRole(id: string) {
		await this.db.delete(role).where(eq(role.id, id)).execute();
	}

	/**
	 * 更新角色的用户关联
	 */
	async updateRoleUsers(roleId: string, userIds: string[]) {
		await this.db.transaction(async (tx) => {
			// 1. 删除旧的关联
			await tx.delete(userRole).where(eq(userRole.roleId, roleId));

			// 2. 插入新的关联
			if (userIds.length > 0) {
				await tx.insert(userRole).values(
					userIds.map((userId) => ({
						roleId,
						userId
					}))
				);
			}
		});
	}
}

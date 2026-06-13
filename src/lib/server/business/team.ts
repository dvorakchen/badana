import type { DbService } from '$lib/server/db';
import { team, user, teamUser } from '$lib/server/db/schema';
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import type { PaginationResult, TeamWithManager, User } from '$lib/shared';
import { inject, injectable } from 'tsyringe';

@injectable()
export class TeamService {
	constructor(@inject('NormalDbService') private dbService: DbService) {}

	private get db() {
		return this.dbService.db;
	}

	/**
	 * 分页获取所有团队（包含负责人信息和人数）
	 * @param page 当前页码
	 * @param pageSize 每页条数
	 */
	async getPaginatedTeams(
		page: number = 1,
		pageSize: number = 10
	): Promise<PaginationResult<TeamWithManager>> {
		const offset = (page - 1) * pageSize;

		// 使用子查询或在主查询中进行聚合以获取人数
		const [rawList, totalRes] = await Promise.all([
			this.db
				.select({
					team: team,
					manager: user,
					memberCount: sql<number>`count(${teamUser.id})`.mapWith(Number)
				})
				.from(team)
				.leftJoin(user, eq(team.managerId, user.id))
				.leftJoin(teamUser, eq(team.id, teamUser.teamId))
				.groupBy(team.id, user.id)
				.limit(pageSize)
				.offset(offset)
				.orderBy(team.createdAt),
			this.db.select({ value: count() }).from(team)
		]);

		const list: TeamWithManager[] = rawList.map((item) => ({
			...item.team,
			manager: item.manager,
			memberCount: item.memberCount
		}));

		const total = totalRes[0].value;

		return {
			list,
			pagination: {
				page,
				pageSize,
				total,
				totalPages: Math.ceil(total / pageSize)
			}
		};
	}

	/**
	 * 根据 ID 获取团队详情（包含负责人信息和人数）
	 * @param name 团队名称
	 */
	async getTeamByName(name: string): Promise<TeamWithManager | null> {
		const result = await this.db
			.select({
				team: team,
				manager: user,
				memberCount: sql<number>`count(${teamUser.id})`.mapWith(Number)
			})
			.from(team)
			.leftJoin(user, eq(team.managerId, user.id))
			.leftJoin(teamUser, eq(team.id, teamUser.teamId))
			.where(eq(team.name, name))
			.groupBy(team.id, user.id)
			.limit(1);

		if (result.length === 0) return null;

		return {
			...result[0].team,
			manager: result[0].manager,
			memberCount: result[0].memberCount
		};
	}

	/**
	 * 获取团队下的所有成员
	 * @param teamId 团队 ID
	 */
	async getTeamMembers(teamId: string): Promise<User[]> {
		const result = await this.db
			.select({
				user: user
			})
			.from(teamUser)
			.innerJoin(user, eq(teamUser.userId, user.id))
			.where(eq(teamUser.teamId, teamId));

		return result.map((r) => r.user);
	}

	/**
	 * 将多个用户加入团队
	 * @param teamId 团队 ID
	 * @param userIds 用户 ID 数组
	 */
	async addUsersToTeam(teamId: string, userIds: string[]) {
		if (userIds.length === 0) return;

		await this.db
			.insert(teamUser)
			.values(
				userIds.map((userId) => ({
					teamId,
					userId
				}))
			)
			.onConflictDoNothing(); // 如果已经在团队里了就忽略
	}

	/**
	 * 将多个用户从团队中移除
	 * @param teamId 团队 ID
	 * @param userIds 用户 ID 数组
	 */
	async removeUsersFromTeam(teamId: string, userIds: string[]) {
		if (userIds.length === 0) return;

		await this.db
			.delete(teamUser)
			.where(and(eq(teamUser.teamId, teamId), inArray(teamUser.userId, userIds)));
	}

	/**
	 * 修改团队负责人
	 * @param teamId 团队 ID
	 * @param managerId 负责人 ID
	 */
	async updateTeamManager(teamId: string, managerId: string) {
		await this.db.transaction(async (tx) => {
			// 1. 更新团队表
			await tx.update(team).set({ managerId }).where(eq(team.id, teamId));

			// 2. 检查负责受是否已经在团队中
			const existing = await tx
				.select()
				.from(teamUser)
				.where(and(eq(teamUser.teamId, teamId), eq(teamUser.userId, managerId)))
				.limit(1);

			if (existing.length === 0) {
				await tx.insert(teamUser).values({
					teamId,
					userId: managerId
				});
			}
		});
	}

	/**
	 * 检查团队名是否已存在
	 */
	async isTeamNameTaken(name: string): Promise<boolean> {
		const existing = await this.db.query.team.findFirst({
			where: (table, { eq }) => eq(table.name, name)
		});
		return !!existing;
	}

	/**
	 * 创建新团队
	 * @param data 团队数据
	 */
	async createTeam(data: { name: string; managerId?: string }) {
		return await this.db.transaction(async (tx) => {
			const existing = await tx.query.team.findFirst({
				where: (table, { eq }) => eq(table.name, data.name)
			});

			if (existing) {
				throw new Error('TEAM_NAME_TAKEN');
			}

			const [inserted] = await tx.insert(team).values(data).returning();
			if (data.managerId) {
				await tx.insert(teamUser).values({
					teamId: inserted.id,
					userId: data.managerId
				});
			}
			return inserted;
		});
	}

	/**
	 * 更新团队名称
	 */
	async updateTeamName(teamId: string, newName: string) {
		const existing = await this.db.query.team.findFirst({
			where: (table, { eq }) => eq(table.name, newName)
		});

		if (existing && existing.id !== teamId) {
			throw new Error('TEAM_NAME_TAKEN');
		}

		await this.db.update(team).set({ name: newName }).where(eq(team.id, teamId));
	}

	/**
	 * 删除团队
	 * @param id 团队 ID
	 */
	async deleteTeam(id: string) {
		await this.db.delete(team).where(eq(team.id, id)).execute();
	}
}

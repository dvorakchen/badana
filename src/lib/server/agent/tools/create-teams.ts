import type { ToolEntry } from '../tool-registry';
import { container } from 'tsyringe';
import { TeamService } from '$lib/server/business/team';
import { UserService } from '$lib/server/business/user';
import { LogService } from '$lib/server/logger';

export const createTeamsTool: ToolEntry = {
	name: 'create_teams',
	definition: {
		type: 'function',
		function: {
			name: 'create_teams',
			description: '创建一个新的团队。',
			parameters: {
				type: 'object',
				properties: {
					name: {
						type: 'string',
						description: '团队名称'
					},
					manager: {
						type: 'string',
						description: '团队负责人名字（可选）'
					}
				},
				required: ['name']
			}
		}
	},
	isDisplay: true,
	execute: async (args) => {
		const name = (args.name as string)?.trim();
		const managerName = (args.manager as string)?.trim();

		if (!name) {
			return '错误: 请提供团队名称参数 name';
		}

		const teamService = container.resolve(TeamService);
		const userService = container.resolve(UserService);
		const logger = container.resolve(LogService);

		let managerId: string | undefined = undefined;

		try {
			if (managerName) {
				managerId = (await userService.getUserByDisplayName(managerName))?.id;
			}

			const isTaken = await teamService.isTeamNameTaken(name);
			if (isTaken) {
				return `错误: 团队名 "${name}" 已存在。`;
			}

			const newTeam = await teamService.createTeam({
				name,
				managerId
			});

			return `成功创建团队 "${newTeam.name}"${managerId ? '，并设置了负责人' : ''}。团队 ID 为 ${newTeam.id}`;
		} catch (err) {
			logger.error(err, '执行 create_teams 工具失败');
			return `创建团队失败: ${(err as Error).message}`;
		}
	},
	base: false
};

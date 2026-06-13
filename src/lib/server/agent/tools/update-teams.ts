import type { ToolEntry } from '../tool-registry';
import { container } from 'tsyringe';
import { TeamService } from '$lib/server/business/team';
import { UserService } from '$lib/server/business/user';
import { LogService } from '$lib/server/logger';

export const updateTeamsTool: ToolEntry = {
    name: 'update_teams',
    definition: {
        type: 'function',
        function: {
            name: 'update_teams',
            description: '修改团队的信息，包括名字，负责人，成员。',
            parameters: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: '要修改的团队当前名称'
                    },
                    newName: {
                        type: 'string',
                        description: '团队的新名称（可选）'
                    },
                    manager: {
                        type: 'string',
                        description: '团队新的负责人名字（可选）'
                    },
                    addMembers: {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                        description: '要添加进团队的成员名字列表（可选）'
                    },
                    removeMembers: {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                        description: '要从团队移除的成员名字列表（可选）'
                    }
                },
                required: ['name']
            }
        }
    },
    isDisplay: true,
    execute: async (args) => {
        const name = (args.name as string)?.trim();
        const newName = (args.newName as string)?.trim();
        const managerName = (args.manager as string)?.trim();
        const addMemberNames = (args.addMembers as string[] | undefined)?.map(n => n.trim()).filter(n => n.length > 0) || [];
        const removeMemberNames = (args.removeMembers as string[] | undefined)?.map(n => n.trim()).filter(n => n.length > 0) || [];

        if (!name) {
            return '错误: 请提供要修改的团队名称参数 name';
        }

        const teamService = container.resolve(TeamService);
        const userService = container.resolve(UserService);
        const logger = container.resolve(LogService);

        try {
            const team = await teamService.getTeamByName(name);
            if (!team) {
                return `错误: 找不到团队 "${name}"。`;
            }

            let resultMessages: string[] = [];

            // 修改团队名
            if (newName && newName !== name) {
                const isTaken = await teamService.isTeamNameTaken(newName);
                if (isTaken) {
                    return `错误: 新团队名 "${newName}" 已存在。`;
                }
                await teamService.updateTeamName(team.id, newName);
                resultMessages.push(`团队名称已修改为 "${newName}"`);
            }

            // 修改负责人
            if (managerName) {
                const manager = await userService.getUserByDisplayName(managerName);
                if (!manager) {
                    return `错误: 找不到负责人 "${managerName}"。`;
                }
                await teamService.updateTeamManager(team.id, manager.id);
                resultMessages.push(`团队负责人已修改为 "${managerName}"`);
            }

            // 添加成员
            if (addMemberNames.length > 0) {
                const userIdsToAdd: string[] = [];
                for (const memberName of addMemberNames) {
                    const user = await userService.getUserByDisplayName(memberName);
                    if (user) {
                        userIdsToAdd.push(user.id);
                    } else {
                        resultMessages.push(`警告: 找不到要添加的用户 "${memberName}"`);
                    }
                }
                if (userIdsToAdd.length > 0) {
                    await teamService.addUsersToTeam(team.id, userIdsToAdd);
                    resultMessages.push(`已将 ${userIdsToAdd.length} 名成员添加到团队`);
                }
            }

            // 移除成员
            if (removeMemberNames.length > 0) {
                const userIdsToRemove: string[] = [];
                for (const memberName of removeMemberNames) {
                    const user = await userService.getUserByDisplayName(memberName);
                    if (user) {
                        userIdsToRemove.push(user.id);
                    } else {
                        resultMessages.push(`警告: 找不到要移除的用户 "${memberName}"`);
                    }
                }
                if (userIdsToRemove.length > 0) {
                    await teamService.removeUsersFromTeam(team.id, userIdsToRemove);
                    resultMessages.push(`已将 ${userIdsToRemove.length} 名成员从团队移除`);
                }
            }

            if (resultMessages.length === 0) {
                return `没有执行任何修改，因为没有提供有效的修改参数。`;
            }

            return `更新团队成功:\n- ` + resultMessages.join('\n- ');
        } catch (err) {
            logger.error(err, '执行 update_teams 工具失败');
            return `更新团队失败: ${(err as Error).message}`;
        }
    },
    base: false
};

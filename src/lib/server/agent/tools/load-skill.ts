import type { ToolEntry } from '../tool-registry';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { env } from '$env/dynamic/private';
import { LogService } from '$lib/server/logger';
import { container } from 'tsyringe';

const SKILLS_DIR = env.AGENT_SKILLS_DIR ?? '';
const VALID_SKILL_NAME = /^[\w一-鿿-]+$/;

export const loadSkillTool: ToolEntry = {
	name: 'load_skill',
	definition: {
		type: 'function',
		function: {
			name: 'load_skill',
			description:
				'加载并查看指定 skill 文件的完整内容。 skill 文件包含处理特定任务的详细指导说明。应先调用 list_skills 了解可用 skills 再加载。',
			parameters: {
				type: 'object',
				properties: {
					name: {
						type: 'string',
						description:
							' skill 文件名（不含扩展名），例如 "employee-onboarding"。从 list_skills 的返回结果中获取。'
					}
				},
				required: ['name']
			}
		}
	},
	isDisplay: false,
	execute: async (args) => {
		const skillName = (args.name as string)?.trim();
		if (!skillName) {
			return '错误: 请提供 skill 名称参数 name';
		}

		if (!VALID_SKILL_NAME.test(skillName)) {
			return `错误: 无效的 skill 名称 "${skillName}"。`;
		}

		const extension = '.md';
		let filePath: string | null = null;
		const candidate = resolve(SKILLS_DIR, `${skillName}${extension}`);
		try {
			await readFile(candidate, 'utf-8');
			filePath = candidate;
		} catch {
			const logger = container.resolve(LogService);
			logger.error({ path: candidate }, '无效的 Skill 路径');
		}

		if (!filePath) {
			return `错误: 找不到 skill 文件 "${skillName}"。请使用 list_skills 查看可用的 skill 文件。`;
		}

		try {
			const content = await readFile(filePath, 'utf-8');
			if (!content.trim()) {
				return ` skill  "${skillName}" 文件内容为空。`;
			}
			return content;
		} catch (err) {
			return `读取 skill 文件失败: ${(err as Error).message}`;
		}
	},
	base: true
};

import type { ToolEntry } from '../tool-registry';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { env } from '$env/dynamic/private';

const SKILLS_DIR = env.AGENT_SKILLS_DIR ?? '';
const VALID_SKILL_NAME = /^[\w一-鿿-]+$/;

export const loadSkillTool: ToolEntry = {
	name: 'load_skill',
	definition: {
		type: 'function',
		function: {
			name: 'load_skill',
			description:
				'加载并查看指定技能文件的完整内容。技能文件包含处理特定任务的详细指导说明。应先调用 list_skills 了解可用技能再加载。',
			parameters: {
				type: 'object',
				properties: {
					name: {
						type: 'string',
						description:
							'技能文件名（不含扩展名），例如 "employee-onboarding"。从 list_skills 的返回结果中获取。'
					}
				},
				required: ['name']
			}
		}
	},
	execute: async (args) => {
		const skillName = (args.name as string)?.trim();
		if (!skillName) {
			return '错误: 请提供技能名称参数 name';
		}

		if (!VALID_SKILL_NAME.test(skillName)) {
			return `错误: 无效的技能名称 "${skillName}"。`;
		}

		const extensions = ['.md', '.txt'];
		let filePath: string | null = null;
		for (const ext of extensions) {
			const candidate = resolve(SKILLS_DIR, `${skillName}${ext}`);
			try {
				await readFile(candidate, 'utf-8');
				filePath = candidate;
				break;
			} catch {
				continue;
			}
		}

		if (!filePath) {
			return `错误: 找不到技能文件 "${skillName}"。请使用 list_skills 查看可用的技能文件。`;
		}

		try {
			const content = await readFile(filePath, 'utf-8');
			if (!content.trim()) {
				return `技能 "${skillName}" 文件内容为空。`;
			}
			return content;
		} catch (err) {
			return `读取技能文件失败: ${(err as Error).message}`;
		}
	},
	searchKeywords: [],
	tags: ['base', 'utility'],
	category: 'utility'
};

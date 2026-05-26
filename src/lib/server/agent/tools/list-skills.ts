import type { ToolEntry } from '../tool-registry';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { env } from '$env/dynamic/private';

const SKILLS_DIR = env.AGENT_SKILLS_DIR ? resolve(env.AGENT_SKILLS_DIR) : '';

function parseFrontmatter(content: string) {
	const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
	if (!match) return { name: '', description: '', body: content };
	const frontmatter = match[1];
	const body = content.slice(match[0].length);
	const name = frontmatter.match(/^name:\s*(.+)/m)?.[1]?.trim() ?? '';
	const description = frontmatter.match(/^description:\s*(.+)/m)?.[1]?.trim() ?? '';
	return { name, description, body };
}

export const listSkillsTool: ToolEntry = {
	name: 'list_skills',
	definition: {
		type: 'function',
		function: {
			name: 'list_skills',
			description:
				'列出系统中所有可用的技能（skill）文件。技能文件包含特定任务的指导说明。当你面对不熟悉的任务类型时，应先调用此工具了解是否有相关技能指南。',
			parameters: { type: 'object', properties: {} }
		}
	},
	execute: async () => {
		try {
			const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
			const skillFiles = entries
				.filter((e) => e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.txt')))
				.sort((a, b) => a.name.localeCompare(b.name));

			if (skillFiles.length === 0) {
				return '(当前没有可用的技能文件)';
			}

			const lines: string[] = [];
			for (const file of skillFiles) {
				const content = await readFile(resolve(SKILLS_DIR, file.name), 'utf-8');
				const { name, description } = parseFrontmatter(content);
				const displayName = name || file.name.replace(/\.(md|txt)$/, '');
				const desc = description || '(无描述)';
				lines.push(`- \`${displayName}\`: ${desc}`);
			}

			return `可用的技能文件 (${skillFiles.length} 个):\n${lines.join('\n')}`;
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
				return '(技能目录不存在，没有可用技能)';
			}
			return `读取技能列表失败: ${(err as Error).message}`;
		}
	},
	base: true
};

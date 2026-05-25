import type { ToolEntry } from '../tool-registry';

export const searchToolsTool: ToolEntry = {
	name: 'search_tools',
	definition: {
		type: 'function',
		function: {
			name: 'search_tools',
			description:
				'在系统工具库中搜索匹配的工具。当你需要的功能不在当前可用工具列表中时，必须先调用此工具查找。',
			parameters: {
				type: 'object',
				properties: {
					query: {
						type: 'string',
						description:
							'搜索关键词，描述你需要什么功能，例如 "查询团队成员"、"创建角色"、"数据库查询"'
					}
				},
				required: ['query']
			}
		}
	},
	execute: async () => '',
	searchKeywords: [],
	tags: ['base', 'utility'],

	category: 'utility'
};

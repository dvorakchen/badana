import type { ToolEntry } from '../tool-registry';

export const getCurrentTimeTool: ToolEntry = {
	name: 'get_current_time',
	definition: {
		type: 'function',
		function: {
			name: 'get_current_time',
			description: '获取当前的服务器时间。',
			parameters: { type: 'object', properties: {} }
		}
	},
	execute: () => `服务器当前时间是: ${new Date().toISOString()}`,
	base: true,
	isDisplay: false
};

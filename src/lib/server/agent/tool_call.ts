import type { ChatCompletionTool } from 'openai/resources/index.mjs';

export function getTools(): ChatCompletionTool[] {
	return [
		{
			type: 'function',
			function: {
				name: 'get_current_time',
				description: '获取当前的服务器时间。',
				parameters: { type: 'object', properties: {} }
			}
		}
	];
}

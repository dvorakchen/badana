import type { ToolRegistry, ToolExecuteContext } from './tool-registry';
import type { User } from '$lib/shared';
import type { LogService } from '$lib/server/logger';
import type {
	ChatCompletionToolMessageParam,
	ChatCompletionMessageFunctionToolCall
} from 'openai/resources/index.mjs';

export async function executeToolCalls(
	toolCalls: ChatCompletionMessageFunctionToolCall[],
	user: User,
	deps: {
		db: ToolExecuteContext['db'];
		toolRegistry: ToolRegistry;
		logger: LogService;
		sendToWs: (payload: unknown) => void;
	}
) {
	const toolResults: ChatCompletionToolMessageParam[] = [];
	const ctx: ToolExecuteContext = { user, db: deps.db };

	for (const toolCall of toolCalls) {
		const name = toolCall.function.name;
		deps.logger.info(`正在执行工具: ${name}`);
		let result: string;

		const tool = deps.toolRegistry.getTool(name);
		if (tool) {
			try {
				const args = JSON.parse(toolCall.function.arguments || '{}');
				result = await tool.execute(args, ctx);
			} catch (err) {
				deps.logger.error(err, `工具 ${name} 执行失败`);
				result = `工具执行出错: ${(err as Error).message}`;
			}
		} else {
			result = `未知工具: ${name}`;
		}

		if (tool?.isDisplay) {
			deps.sendToWs({
				type: 'tool-call-start',
				data: { name: toolCall.function?.name, args: toolCall.function.arguments }
			});
			deps.sendToWs({
				type: 'tool-call-end',
				data: { result }
			});
		}

		toolResults.push({
			role: 'tool',
			tool_call_id: toolCall.id,
			content: result
		});
	}

	return toolResults;
}

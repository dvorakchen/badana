/**
 * AI Agent 核心实现
 *
 * ## 整体流程
 * 1. 用户通过 WebSocket 发送文本 → handleAiChatMsg 调用 agent.ask()
 * 2. ask() 组装消息（system prompt + 历史会话 + 本轮提问）
 * 3. 进入 while(true) 循环与 AI 交互：
 *    - 调用 AI API（流式），实时推送文本/思考/工具调用到前端
 *    - 如果 AI 返回工具调用 → 执行工具 → 结果追加到消息列表 → 继续循环
 *    - 如果 AI 无工具调用 → 回答完成 → 保存会话到数据库 → 退出循环
 *
 * ## 动态工具加载
 * 每轮对话只加载 base 工具（get_current_time + search_tools）。
 * 当 AI 需要其他工具时调用 search_tools(query)，
 * 系统搜索工具注册表并将匹配工具注入下一轮 API 调用。
 */

import { inject, injectable } from 'tsyringe';
import { env } from '$env/dynamic/private';
import type { User } from '$lib/shared';
import { PermissionService } from '$lib/server/business/permission';
import type { DbService } from '$lib/server/db';
import { LogService } from '$lib/server/logger';
import { type WebSocket } from 'ws';
import type { WebSocketWithUser } from '$lib/server/websocket';
import OpenAI from 'openai';
import { aiChatSessions } from '$lib/server/db/ai.schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { ToolRegistry, type ToolExecuteContext } from './tool-registry';
import type { ToolEntry } from './tool-registry';
import type {
	ChatCompletionMessageParam,
	ChatCompletionAssistantMessageParam,
	ChatCompletionToolMessageParam,
	ChatCompletionChunk,
	ChatCompletionMessageToolCall,
	ChatCompletionMessageFunctionToolCall
} from 'openai/resources/index.mjs';
import type { Stream } from 'openai/streaming.mjs';
import { searchToolsTool } from './tools/search-tools';
import { systemPrompt } from './prompt';

@injectable()
export class AgentService {
	private readonly openai: OpenAI;
	private readonly model: string;
	private ws: WebSocket | undefined;

	/**
	 * AI Agent 使用只读数据库连接，防止 AI 执行删除/修改操作
	 */
	private get db() {
		return this.dbService.db;
	}

	constructor(
		@inject('NormalDbService') private dbService: DbService,
		private permissionService: PermissionService,
		private logger: LogService,
		private toolRegistry: ToolRegistry
	) {
		this.model = env.AGENT_MODEL ?? '';
		this.openai = new OpenAI({
			baseURL: (env.AGENT_URL ?? '') + '/v1',
			apiKey: env.AGENT_KEY ?? ''
		});
	}

	/**
	 * 绑定当前 WebSocket 连接，用于向该客户端推送流式内容
	 */
	setWs(ws: WebSocketWithUser) {
		this.ws = ws;
	}

	/**
	 * 拼装发送给 AI 的完整消息列表
	 *
	 * 结构: [system prompt] + [历史会话(最近10轮)] + [本轮用户提问]
	 * 历史会话从 ai_chat_sessions 表按 sessionId 查出，
	 * 取最近 10 条后反转为时间正序，展平 agentMessages 拼入上下文。
	 */
	private async initMessages(user: User, sessionId: string, txt: string) {
		const existingSessionsRaw = await this.db
			.select()
			.from(aiChatSessions)
			.where(eq(aiChatSessions.sessionId, sessionId))
			.orderBy(desc(aiChatSessions.createdAt))
			.limit(10);

		// 数据库按时间倒序查出，反转后变正序，保证对话历史按先后排列
		const existingSessions = existingSessionsRaw.reverse();

		const permissions = await this.permissionService.getPermissionsByUserId(user.id);
		const prompt = await systemPrompt(user, permissions);
		const baseMessages: ChatCompletionMessageParam[] = [{ role: 'system', content: prompt }];

		// 将历史 session 的 agentMessages 展平拼入消息列表
		for (const session of existingSessions) {
			if (session.agentMessages && session.agentMessages.length > 0) {
				baseMessages.push(...(session.agentMessages as ChatCompletionMessageParam[]));
			}
		}

		// 最后追加本轮用户提问
		baseMessages.push({ role: 'user', content: txt });

		return baseMessages;
	}

	/**
	 * 解析 AI 返回的流式响应
	 *
	 * AI 的回复是一块一块(chunk)到达的，每块只包含增量(delta)。
	 * 这个方法遍历所有 chunk，从中提取三类内容：
	 * - textContent:      普通文本（累加所有 delta.content）
	 * - reasoningContent: 思考过程（累加所有 delta.reasoning_content）
	 * - toolCalls:        工具调用（按 index 归并碎片，因为一个工具调用的
	 *                      name 和 arguments 可能分散在多个 chunk 中）
	 *
	 * 每收到一块内容就实时推送到前端（sendToWs），实现打字机效果。
	 */
	private async parseDeltaStream(stream: Stream<ChatCompletionChunk>) {
		let textContent = '';
		let reasoningContent = '';

		const toolCallsMap = new Map<number, ChatCompletionMessageFunctionToolCall>();

		for await (const chunk of stream) {
			const delta = chunk.choices?.[0]?.delta;
			if (delta) {
				// 思考过程（部分模型支持，如 qwen3.6）
				if ((delta as { reasoning_content: string }).reasoning_content) {
					const r = (delta as { reasoning_content: string }).reasoning_content;
					reasoningContent += r;
					this.sendToWs({ type: 'thinking-chunk', data: r });
				}
				// 普通文本
				if (delta.content) {
					textContent += delta.content;
					this.sendToWs({ type: 'plain-chunk', data: delta.content });
				}
				// 工具调用碎片：按 index 归并，同一 index 的多块碎片拼接成完整调用
				if (delta.tool_calls) {
					for (const toolCall of delta.tool_calls) {
						const index = toolCall.index;
						if (!toolCallsMap.has(index)) {
							toolCallsMap.set(index, {
								id: toolCall.id ?? '',
								type: 'function',
								function: { name: toolCall.function?.name || '', arguments: '' }
							});
							this.sendToWs({
								type: 'tool-call-start',
								data: { name: toolCall.function?.name, args: '' }
							});
						}

						const existingCall = toolCallsMap.get(index);
						if (existingCall && existingCall.function && toolCall.function?.arguments) {
							existingCall.function.arguments += toolCall.function.arguments;
						}
					}
				}
			}
		}

		return {
			textContent,
			reasoningContent,
			toolCalls: Array.from(toolCallsMap.values())
		};
	}

	/**
	 * 执行 AI 请求的工具调用
	 *
	 * 分两种工具处理：
	 *
	 * 1. search_tools —— 动态工具发现
	 *    AI 传入 query 参数搜索工具注册表，匹配到的工具名注入
	 *    activeDynamicTools 集合。下一轮 while 循环中这些工具会
	 *    出现在 API 调用的 tools 数组里，AI 就能直接调用它们了。
	 *    返回给 AI 的是匹配工具的列表文本（名称+描述+分类）。
	 *
	 * 2. 其他工具 —— 从注册表取执行函数
	 *    通过 toolRegistry.getExecutor(name) 查找对应的执行函数，
	 *    传入工具参数 + 上下文(user)，执行并返回结果文本。
	 *
	 * @returns toolResults   —— 返回给 AI 的工具执行结果
	 * @returns newToolNames  —— 本次新加载的工具名（由 search_tools 触发）
	 */
	private async executeToolCalls(
		toolCalls: ChatCompletionMessageFunctionToolCall[],
		activeDynamicTools: Set<string>,
		user: User
	) {
		const toolResults: ChatCompletionToolMessageParam[] = [];
		const newToolNames: string[] = [];
		const ctx: ToolExecuteContext = { user, db: this.db };

		for (const toolCall of toolCalls) {
			const name = toolCall.function.name;
			this.logger.info(`正在执行工具: ${name}`);
			let result: string;

			if (name === searchToolsTool.name) {
				// --- 动态工具发现 ---
				const args = JSON.parse(toolCall.function.arguments || '{}');
				const query = args.query ?? '';
				const matched = this.toolRegistry.search(query);

				if (matched.length === 0) {
					result = '未找到相关工具。请告知用户当前系统没有对应的功能，并建议用户联系管理员。';
				} else {
					// 将匹配工具注入本轮对话的动态工具集，下次 API 调用生效
					for (const entry of matched) {
						if (!activeDynamicTools.has(entry.name)) {
							activeDynamicTools.add(entry.name);
							newToolNames.push(entry.name);
							this.logger.info(`动态加载工具: ${entry.name}`);
						}
					}
					result = formatSearchResults(matched);
				}
			} else {
				// --- 常规工具执行 ---
				const executor = this.toolRegistry.getExecutor(name);
				if (executor) {
					try {
						const args = JSON.parse(toolCall.function.arguments || '{}');
						result = await executor(args, ctx);
					} catch (err) {
						this.logger.error(err, `工具 ${name} 执行失败`);
						result = `工具执行出错: ${(err as Error).message}`;
					}
				} else {
					result = `未知工具: ${name}`;
				}
			}

			// 通知前端工具执行完毕
			this.sendToWs({
				type: 'tool-call-end',
				data: { result }
			});

			// 工具结果作为 tool 角色消息追加到对话
			toolResults.push({
				role: 'tool',
				tool_call_id: toolCall.id,
				content: result
			});
		}

		return { toolResults, newToolNames };
	}

	/**
	 * 处理一次用户提问（AI 对话的主入口）
	 *
	 * ## 流程
	 * 1. 拼装消息（system + 历史 + 本轮提问）
	 * 2. 进入 while(true) 循环：
	 *    a. 构建当前可用工具列表 = base 工具 + 本轮已动态加载的工具
	 *    b. 流式调用 AI API，实时推送内容到前端
	 *    c. 如果 AI 返回工具调用 → 执行工具（search_tools 会注入新工具）→ continue
	 *    d. 如果 AI 无工具调用 → 回答完毕 → 保存会话到数据库 → break
	 *
	 * ## 关键变量
	 * - activeDynamicTools: 对话级 Set<string>，记录 search_tools 在本对话中
	 *   已加载的工具名。每次循环和 base 工具合并后作为 API 的 tools 参数。
	 *   对话结束后自动销毁，不同对话互不干扰。
	 * - agentMessages: 单独记录本轮对话中新增的消息（提问 + 回复 + 工具调用），
	 *   最终整段存入 ai_chat_sessions 表，下次对话作为历史上下文加载。
	 */
	async ask(user: User, sessionId: string, txt: string /*img: string[]*/) {
		this.logger.debug({ sessionId }, 'session id');

		const messages = await this.initMessages(user, sessionId, txt);
		const agentMessages: ChatCompletionMessageParam[] = [{ role: 'user', content: txt }];

		// 本轮对话动态加载的工具名集合，每次 while 迭代时和 base 工具合并
		const activeDynamicTools = new Set<string>();

		try {
			while (true) {
				// 每次迭代重新构建工具列表：base（始终可用）+ 动态加载的
				const baseNames = this.toolRegistry.getBaseToolNames();
				const allActiveNames = new Set([...baseNames, ...activeDynamicTools]);
				const tools = this.toolRegistry.getDefinitions(allActiveNames);

				const stream = await this.openai.chat.completions.create({
					model: this.model,
					messages: messages,
					tools: tools,
					stream: true
				});

				const { textContent, reasoningContent, toolCalls } = await this.parseDeltaStream(stream);

				// AI 返回了工具调用 → 执行工具，结果加入消息列表，继续循环
				if (toolCalls.length > 0) {
					// 将 AI 的工具调用意图作为 assistant 消息存入上下文
					const assistantMsg: ChatCompletionAssistantMessageParam = {
						role: 'assistant',
						content: textContent || null,
						tool_calls: toolCalls as ChatCompletionMessageToolCall[]
					};
					// @ts-expect-error reasoning_content 属性是有的
					if (reasoningContent) assistantMsg.reasoning_content = reasoningContent;

					messages.push(assistantMsg);
					agentMessages.push(assistantMsg);

					// 执行工具（search_tools 会修改 activeDynamicTools，下轮生效）
					const execResult = await this.executeToolCalls(toolCalls, activeDynamicTools, user);
					messages.push(...execResult.toolResults);
					agentMessages.push(...execResult.toolResults);

					continue;
				}

				// AI 无工具调用 → 回答完毕
				const finalAssistantMsg: ChatCompletionAssistantMessageParam = {
					role: 'assistant',
					content: textContent || null
				};
				// @ts-expect-error reasoning_content 属性是有的
				if (reasoningContent) finalAssistantMsg.reasoning_content = reasoningContent;

				messages.push(finalAssistantMsg);
				agentMessages.push(finalAssistantMsg);

				// 保存本轮对话到数据库，下次对话复用历史上下文
				await this.appendChatSession(user.id, sessionId, agentMessages);

				break;
			}
		} catch (error) {
			this.logger.error(error, '流式调用 AI 接口异常');
			this.sendToWs({
				type: 'plain-chunk',
				data: '抱歉，与 AI 服务通信时出错。'
			});
		}
	}

	/**
	 * 将本轮对话消息存入 ai_chat_sessions 表
	 * agentMessages 格式兼容 OpenAI ChatCompletionMessageParam，
	 * 下次对话时直接展平拼入上下文即可。
	 */
	private async appendChatSession(
		userId: string,
		sessionId: string,
		agentMessages: ChatCompletionMessageParam[]
	) {
		try {
			await this.db.insert(aiChatSessions).values({
				id: uuidv4(),
				userId,
				sessionId,
				agentMessages
			});
		} catch (error) {
			this.logger.error(error, '将本轮对话消息存入 ai_chat_sessions 表失败');
		}
	}

	/**
	 * 向当前 WebSocket 客户端推送消息，格式为 { type: 'ai-chat', payload }
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private sendToWs(payload: any) {
		if (this.ws && this.ws.readyState === 1) {
			this.ws.send(
				JSON.stringify({
					type: 'ai-chat',
					payload
				})
			);
		}
	}
}

/**
 * 将 search_tools 的匹配结果格式化为 AI 可读的文本
 * 每行列出工具名、描述、分类，AI 据此决定下一步调用哪个工具
 */
function formatSearchResults(entries: ToolEntry[]): string {
	const lines = entries.map((e) => {
		const params = e.definition.function.parameters as Record<string, unknown> | undefined;
		const props = params?.properties as
			| Record<string, { type?: string; description?: string }>
			| undefined;

		let paramStr = '';
		if (props) {
			const required = (params?.required as string[]) ?? [];
			paramStr = Object.entries(props)
				.map(([name, prop]) => {
					const req = required.includes(name) ? '(必填)' : '(可选)';
					return `${name}: ${prop.type ?? 'unknown'} ${req}`;
				})
				.join(', ');
		}

		const paramLine = paramStr ? `\n    参数: ${paramStr}` : '';
		return `- \`${e.name}\`: ${e.definition.function.description} [${e.category}]${paramLine}`;
	});
	return `找到以下 ${entries.length} 个工具，你现在可以调用它们了:\n${lines.join('\n')}`;
}

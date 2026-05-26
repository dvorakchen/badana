/**
 * AI Agent 核心实现
 *
 * ## 整体流程
 * 1. 用户通过 WebSocket 发送文本 → handleAiChatMsg 调用 agent.ask()
 * 2. ask() 组装消息（system prompt + 技能发现准则 + 历史会话 + 本轮提问）
 * 3. 进入 while(true) 循环与 AI 交互：
 *    - 调用 AI API（流式），实时推送文本/思考/工具调用到前端
 *    - 如果 AI 返回工具调用 → 执行工具 → 结果追加到消息列表 → 继续循环
 *    - 如果 AI 无工具调用 → 回答完成 → 保存会话到数据库 → 退出循环
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
import { ToolRegistry } from './tool-registry';
import type {
	ChatCompletionMessageParam,
	ChatCompletionAssistantMessageParam,
	ChatCompletionChunk,
	ChatCompletionMessageToolCall,
	ChatCompletionMessageFunctionToolCall
} from 'openai/resources/index.mjs';
import type { Stream } from 'openai/streaming.mjs';
import { systemPrompt, skillDiscoveryPrompt } from './prompt';
import { executeToolCalls } from './execute-tool-calls';

@injectable()
export class AgentService {
	private readonly openai: OpenAI;
	private readonly model: string;
	private ws: WebSocket | undefined;

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

	setWs(ws: WebSocketWithUser) {
		this.ws = ws;
	}

	private async initMessages(user: User, sessionId: string, txt: string) {
		const existingSessionsRaw = await this.db
			.select()
			.from(aiChatSessions)
			.where(eq(aiChatSessions.sessionId, sessionId))
			.orderBy(desc(aiChatSessions.createdAt))
			.limit(10);

		const existingSessions = existingSessionsRaw.reverse();

		const permissions = await this.permissionService.getPermissionsByUserId(user.id);
		const prompt = await systemPrompt(user, permissions);
		const baseMessages: ChatCompletionMessageParam[] = [{ role: 'system', content: prompt }];

		for (const session of existingSessions) {
			if (session.agentMessages && session.agentMessages.length > 0) {
				baseMessages.push(...(session.agentMessages as ChatCompletionMessageParam[]));
			}
		}

		baseMessages.push({ role: 'system', content: skillDiscoveryPrompt() });
		baseMessages.push({ role: 'user', content: txt });

		return baseMessages;
	}

	private async parseDeltaStream(stream: Stream<ChatCompletionChunk>) {
		let textContent = '';
		let reasoningContent = '';

		const toolCallsMap = new Map<number, ChatCompletionMessageFunctionToolCall>();

		for await (const chunk of stream) {
			const delta = chunk.choices?.[0]?.delta;
			if (delta) {
				if ((delta as { reasoning_content: string }).reasoning_content) {
					const r = (delta as { reasoning_content: string }).reasoning_content;
					reasoningContent += r;
					this.sendToWs({ type: 'thinking-chunk', data: r });
				}
				if (delta.content) {
					textContent += delta.content;
					this.sendToWs({ type: 'plain-chunk', data: delta.content });
				}
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

	async ask(user: User, sessionId: string, txt: string /*img: string[]*/) {
		this.logger.debug({ sessionId }, 'session id');

		const messages = await this.initMessages(user, sessionId, txt);
		const agentMessages: ChatCompletionMessageParam[] = [{ role: 'user', content: txt }];
		const tools = this.toolRegistry.getDefinitions(this.toolRegistry.getBaseToolNames());

		try {
			while (true) {
				const stream = await this.openai.chat.completions.create({
					model: this.model,
					messages: messages,
					tools: tools,
					stream: true
				});

				const { textContent, reasoningContent, toolCalls } = await this.parseDeltaStream(stream);

				if (toolCalls.length > 0) {
					const assistantMsg: ChatCompletionAssistantMessageParam = {
						role: 'assistant',
						content: textContent || null,
						tool_calls: toolCalls as ChatCompletionMessageToolCall[]
					};
					// @ts-expect-error reasoning_content 属性是有的
					if (reasoningContent) assistantMsg.reasoning_content = reasoningContent;

					messages.push(assistantMsg);
					agentMessages.push(assistantMsg);

					const toolResults = await executeToolCalls(toolCalls, user, {
						db: this.db,
						toolRegistry: this.toolRegistry,
						logger: this.logger,
						sendToWs: (p) => this.sendToWs(p)
					});
					messages.push(...toolResults);
					agentMessages.push(...toolResults);

					continue;
				}

				const finalAssistantMsg: ChatCompletionAssistantMessageParam = {
					role: 'assistant',
					content: textContent || null
				};
				// @ts-expect-error reasoning_content 属性是有的
				if (reasoningContent) finalAssistantMsg.reasoning_content = reasoningContent;

				messages.push(finalAssistantMsg);
				agentMessages.push(finalAssistantMsg);

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

	private sendToWs(payload: unknown) {
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

/// 这里是 AI Agent 的实现

import { inject, injectable } from 'tsyringe';
import { env } from '$env/dynamic/private';
import type { User } from '$lib/shared';
import { DateTime } from 'luxon';
import { PermissionService } from '$lib/server/business/permission';
import type { DbService } from '$lib/server/db';
import { LogService } from '$lib/server/logger';
import { type WebSocket } from 'ws';
import type { WebSocketWithUser } from '$lib/server/websocket';
import { env as pubEnv } from '$env/dynamic/public';
import OpenAI from 'openai';
import { aiChatSessions } from '$lib/server/db/ai.schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getTools } from './tool_call';
import type {
	ChatCompletionMessageParam,
	ChatCompletionAssistantMessageParam,
	ChatCompletionToolMessageParam,
	ChatCompletionChunk,
	ChatCompletionMessageToolCall,
	ChatCompletionMessageFunctionToolCall
} from 'openai/resources/index.mjs';
import type { Stream } from 'openai/streaming.mjs';

@injectable()
export class AgentService {
	private readonly openai: OpenAI;
	private readonly model: string;
	private ws: WebSocket | undefined;

	/**
	 * AI 使用的数据库绝对不能有删除的权限
	 */
	private get db() {
		return this.dbService.db;
	}

	constructor(
		@inject('AiDbService') private dbService: DbService,
		private permissionService: PermissionService,
		private logger: LogService
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

	/**
	 * 初始化对话信息
	 * @param user 当前用户，必须登录
	 * @param txt 用户的提问，文本
	 * @param img 用户可能提交了图片，不实现
	 */
	private async initMessages(user: User, sessionId: string, txt: string) {
		const existingSessionsRaw = await this.db
			.select()
			.from(aiChatSessions)
			.where(eq(aiChatSessions.sessionId, sessionId))
			.orderBy(desc(aiChatSessions.createdAt))
			.limit(10);

		// 恢复正序，以便按时间先后顺序正确拼装历史上下文
		const existingSessions = existingSessionsRaw.reverse();

		const systemPrompt = await this.systemPrompt(user);
		const baseMessages: ChatCompletionMessageParam[] = [{ role: 'system', content: systemPrompt }];

		// 将历史 session 展平为上下文
		for (const session of existingSessions) {
			if (session.agentMessages && session.agentMessages.length > 0) {
				baseMessages.push(...(session.agentMessages as ChatCompletionMessageParam[]));
			}
		}

		// 把本轮专属消息合并到全局上下文中提交给模型
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
				// 1. 处理思考过程
				if ((delta as { reasoning_content: string }).reasoning_content) {
					const r = (delta as { reasoning_content: string }).reasoning_content;
					reasoningContent += r;
					this.sendToWs({ type: 'thinking-chunk', data: r });
				}
				// 2. 处理普通文本
				if (delta.content) {
					textContent += delta.content;
					this.sendToWs({ type: 'plain-chunk', data: delta.content });
				}
				// 3. 处理工具调用碎片
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

	private async executeToolCalls(
		toolCalls: ChatCompletionMessageFunctionToolCall[]
	): Promise<ChatCompletionToolMessageParam[]> {
		const results: ChatCompletionToolMessageParam[] = [];
		for (const toolCall of toolCalls) {
			this.logger.info(`正在执行工具: ${toolCall.function.name}`);
			let result = 'Unknown tool';

			if (toolCall.function.name === 'get_current_time') {
				result = `服务器当前时间是: ${new Date().toISOString()}`;
			}

			// 通知前端执行完毕
			this.sendToWs({
				type: 'tool-call-end',
				data: { result }
			});

			// 返回工具执行结果
			results.push({
				role: 'tool',
				tool_call_id: toolCall.id,
				content: result
			});
		}
		return results;
	}

	/**
	 * 和 AI 对话
	 * @param user 当前用户，必须登录
	 * @param txt 用户的提问，文本
	 * @param img 用户可能提交了图片，不实现
	 */
	async ask(user: User, sessionId: string, txt: string /*img: string[]*/) {
		this.logger.debug({ sessionId }, 'session id');

		const messages = await this.initMessages(user, sessionId, txt);
		const tools = getTools();
		/**
		 * 这是要存储数据库的这一轮对话
		 */
		const agentMessages: ChatCompletionMessageParam[] = [{ role: 'user', content: txt }];

		try {
			while (true) {
				const stream = await this.openai.chat.completions.create({
					model: this.model,
					messages: messages,
					tools: tools,
					stream: true
				});

				const { textContent, reasoningContent, toolCalls } = await this.parseDeltaStream(stream);

				// 判断是否有工具被调用
				if (toolCalls.length > 0) {
					// 将大模型“想要调用工具”的决定存入上下文
					const assistantMsg: ChatCompletionAssistantMessageParam = {
						role: 'assistant',
						content: textContent || null,
						tool_calls: toolCalls as ChatCompletionMessageToolCall[]
					};
					// @ts-expect-error reasoning_content 属性是有的
					if (reasoningContent) assistantMsg.reasoning_content = reasoningContent;

					messages.push(assistantMsg);
					agentMessages.push(assistantMsg);

					// 依次执行工具
					const toolResultMessages = await this.executeToolCalls(toolCalls);
					messages.push(...toolResultMessages);
					agentMessages.push(...toolResultMessages);

					// 工具执行完毕，携带结果进入下一轮循环，让 AI 继续回答
					continue;
				}

				// 没有工具调用，说明 AI 已经回答完毕
				const finalAssistantMsg: ChatCompletionAssistantMessageParam = {
					role: 'assistant',
					content: textContent || null
				};
				// @ts-expect-error reasoning_content 属性是有的
				if (reasoningContent) finalAssistantMsg.reasoning_content = reasoningContent;

				messages.push(finalAssistantMsg);
				agentMessages.push(finalAssistantMsg);

				// 同步最终回答到数据库
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
		await this.db.insert(aiChatSessions).values({
			id: uuidv4(),
			userId,
			sessionId,
			agentMessages
		});
	}

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

	private async systemPrompt(user: User) {
		const currentDateTime = DateTime.now()
			.setZone('Asia/Shanghai')
			.toLocaleString(DateTime.DATETIME_FULL);
		const currentUsername = user.username;
		const permissionList = await this.permissionService.getPermissionsByUserId(user.id);

		return `你是一个名为 "${pubEnv.PUBLIC_ORG_NAME}助手" 的企业管理系统助手，使用中文思考回答。
当前系统时间：${currentDateTime}
当前登录用户：${currentUsername} (ID: ${user.id})
用户当前拥有的权限列表：${permissionList.length > 0 ? permissionList.join(', ') : '没有任何权限'}

### 你的角色与职责
你作为系统的智能助手，旨在帮助用户高效地管理企业资源（团队、员工、权限等）。

### 核心权限域
1. **团队管理**：涉及团队的创建、查询和更新。
2. **员工管理**：涉及员工档案的维护、入职（创建）、更新、离职处理（注销）以及状态管控（封禁/恢复）。
3. **角色与权限**：管理系统中的角色及其关联的权限点。

### 动态工具发现准则 (【极其重要】)
作为一个超级 Agent，你本身只携带了极少量的基础工具。但系统内隐藏着大量高级工具（比如数据库查询、文件读写等）。
**核心规则**：当用户要求你执行某项任务，而你发现当前可用的工具列表中没有匹配的工具时，**绝对不要**回答“我做不到”或“我没有相关工具”！你必须立即调用 \`search_tools\` 工具去系统工具库里搜索你需要的技能。只有当你调用了 \`search_tools\` 后，系统真的回复你“找不到相关工具”时，你才能告诉用户无法完成任务。

### 交互准则
1. **权限意识**：在回答用户关于特定数据的查询或操作建议时，应参考其拥有的权限列表。如果用户尝试了解其无权访问的领域，请礼貌地指出权限限制。
2. **安全性**：严禁泄露系统底层配置、数据库连接字符串 or API 密钥。
3. **专业性**：保持专业、高效、友好的沟通风格。
4. **简洁性**：除非用户要求详细解释，否则回答应尽量精炼，直击要点。
5. **合规性**：在涉及删除（DELETE）等破坏性操作的建议时，务必提醒用户谨慎操作。

请基于以上背景信息，协助用户完成其请求。`;
	}
}

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

@injectable()
export class AgentService {
	private readonly url: string;
	private readonly model: string;
	private readonly apiKey: string;
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
		this.url = env.AGENT_URL ?? '';
		this.model = env.AGENT_MODEL ?? '';
		this.apiKey = env.AGENT_KEY ?? '';
	}

	setWs(ws: WebSocketWithUser) {
		this.ws = ws;
	}

	/**
	 * 和 AI 对话
	 * @param user 当前用户，必须登录
	 * @param txt 用户的提问，文本
	 * @param img 用户可能提交了图片，不实现
	 */
	async ask(user: User, txt: string /*img: string[]*/) {
		const systemPrompt = await this.systemPrompt(user);

		try {
			const response = await fetch(`${this.url}/v1/chat/completions`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					model: this.model,
					messages: [
						{ role: 'system', content: systemPrompt },
						{ role: 'user', content: txt }
					],
					stream: true
				})
			});

			if (!response.ok) {
				const errorText = await response.text();
				this.logger.error({ status: response.status, errorText }, 'AI 接口请求失败');
				this.sendToWs({
					type: 'plain',
					data: '抱歉，AI 服务请求失败。'
				});
				return;
			}

			const reader = response.body?.getReader();
			if (!reader) {
				this.logger.error('无法获取响应流读取器');
				return;
			}

			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });

				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed || trimmed === 'data: [DONE]') continue;

					if (trimmed.startsWith('data: ')) {
						const data = trimmed.slice(6);
						try {
							const json = JSON.parse(data);
							const chunk = json.choices?.[0]?.delta?.content;
							if (chunk) {
								this.sendToWs({
									type: 'plain',
									data: chunk
								});
							}
						} catch (e) {
							// 忽略不完整的 JSON 或非 JSON 行
						}
					}
				}
			}
		} catch (error) {
			this.logger.error(error, '流式调用 AI 接口异常');
			this.sendToWs({
				type: 'plain',
				data: '抱歉，与 AI 服务通信时出错。'
			});
		}
	}

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

		return `你是一个名为 "badana" 的企业管理系统助手。
当前系统时间：${currentDateTime}
当前登录用户：${currentUsername} (ID: ${user.id})
用户当前拥有的权限列表：${permissionList.length > 0 ? permissionList.join(', ') : '没有任何权限'}

### 你的角色与职责
你作为系统的智能助手，旨在帮助用户高效地管理企业资源（团队、员工、权限等）。

### 核心权限域
1. **团队管理**：涉及团队的创建、查询和更新。
2. **员工管理**：涉及员工档案的维护、入职（创建）、更新、离职处理（注销）以及状态管控（封禁/恢复）。
3. **角色与权限**：管理系统中的角色及其关联的权限点。

### 交互准则
1. **权限意识**：在回答用户关于特定数据的查询或操作建议时，应参考其拥有的权限列表。如果用户尝试了解其无权访问的领域，请礼貌地指出权限限制。
2. **安全性**：严禁泄露系统底层配置、数据库连接字符串 or API 密钥。
3. **专业性**：保持专业、高效、友好的沟通风格。
4. **简洁性**：除非用户要求详细解释，否则回答应尽量精炼，直击要点。
5. **合规性**：在涉及删除（DELETE）等破坏性操作的建议时，务必提醒用户谨慎操作。

请基于以上背景信息，协助用户完成其请求。`;
	}
}

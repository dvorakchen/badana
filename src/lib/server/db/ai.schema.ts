import { pgTable, text, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

/**
 * AI Provider 配置表
 *
 * 存储 AI 模型提供商的连接信息。支持配置多个 Provider（如不同的模型、地址）。
 * AgentService 在初始化时读取所有启用的 Provider。
 */
export const aiProvider = pgTable('ai_provider', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	url: text('url').notNull(),
	model: text('model').notNull(),
	apiKey: text('api_key').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

export const aiChatSessions = pgTable('ai_chat_sessions', {
	id: text('id').primaryKey(), // 唯一 ID
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),

	// 对话组的标识：由前端打开窗口时生成的 UUID，用来将多次提问串联成一次连贯的上下文
	sessionId: text('session_id').notNull(),

	// 当次提问的完整上下文（包含用户的首次提问，以及 Agent 的所有回复、工具调用等）
	// 【关键要求】：这里面存储的对象格式必须 100% 兼容 OpenAI 的 ChatCompletionMessageParam！
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	agentMessages: jsonb('agent_messages').$type<any[]>().notNull().default([]),

	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

export const aiChatSessions = pgTable('ai_chat_sessions', {
	id: text('id').primaryKey(), // 唯一 ID
	userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
	
	// 对话组的标识：由前端打开窗口时生成的 UUID，用来将多次提问串联成一次连贯的上下文
	sessionId: text('session_id').notNull(),
	
	// 当次提问的完整上下文（包含用户的首次提问，以及 Agent 的所有回复、工具调用等）
	// 【关键要求】：这里面存储的对象格式必须 100% 兼容 OpenAI 的 ChatCompletionMessageParam！
	agentMessages: jsonb('agent_messages').$type<any[]>().notNull().default([]),
	
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

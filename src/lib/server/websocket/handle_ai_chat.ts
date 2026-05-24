import type { RxDataAiChat, TxDataAiChat, TxDataAiChatTxtImgs } from '$lib/client/websocket/model';
import { logger } from '$lib/server/logger';
import { container } from 'tsyringe';
import { AgentService } from '../agent';
import type { TxData } from './model';
import { type WebSocket } from 'ws';
import type { WebSocketWithUser } from '.';

/**
 * 处理和 AI 对话的逻辑
 * 
 * 所有逻辑处理完后需要发送一个：
 * ```
 * {
        type: 'ai-chat',
        payload: {
            type: 'end',
            data: null
        }
    }
 * ```

    给客户端表示 AI 回答完了你的对话
 */
export async function handleAiChatMsg(ws: WebSocketWithUser, payload: TxDataAiChat) {
	const { type, data } = payload;

	if (!ws.user || (type === 'txt-imgs' && !(data as any)?.txt)) {
		// 发送 end 结束
		sendAiChat(ws, {
			type: 'end',
			data: null
		});
		return;
	}

	const agent = container.resolve(AgentService);
	agent.setWs(ws);

	switch (type) {
		case 'txt-imgs':
			{
				const d = data as TxDataAiChatTxtImgs;
				logger.info(`AI Chat Request from ${ws.user.username}: ${d.txt}`);
				await agent.ask(ws.user, d.sessionId, d.txt);
			}
			break;

		default: {
			ws.send(JSON.stringify(UNKNOW_RESPONSE));
			return;
		}
	}

	// 发送 end 结束
	sendAiChat(ws, {
		type: 'end',
		data: null
	});
}

function sendAiChat(ws: WebSocket, payload: RxDataAiChat) {
	const response = {
		type: 'ai-chat',
		payload
	};
	logger.debug(response, 'txt-imgs response');

	ws.send(JSON.stringify(response));
}

const UNKNOW_RESPONSE: TxData = {
	type: 'ai-chat',
	payload: {
		type: 'unknow',
		data: ''
	}
};

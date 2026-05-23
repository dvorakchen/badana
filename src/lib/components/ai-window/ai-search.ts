import type { RxDataAiChat } from '$lib/client/websocket/model';
import { ChatBubble, type ChatContext } from './context';

/**
 * 订阅服务端响应的 AI 聊天信息，end 除外
 */
export function subscribeAiChatRx(ctx: ChatContext, payload: RxDataAiChat) {
	if (!payload.type) {
		return;
	}

	switch (payload.type) {
		case 'plain-chunk':
			ctx.addPlainChunk((payload.data as string) ?? '');
			break;
		case 'thinking-chunk':
			ctx.addThinkingChunk((payload.data as string) ?? '');
			break;
		case 'tool-call-start': {
			const data = payload.data as { name: string; args: string };
			ctx.addToolCall(data.name, data.args);
			break;
		}
		case 'tool-call-end': {
			const data = payload.data as { result: string };
			ctx.finishToolCall(data.result);
			break;
		}
		case 'tool-call-confirm': {
			const data = payload.data as { name: string; args: string };
			const onApprove = () => {
				import('$lib/client/websocket/index').then(({ wsClient }) => {
					wsClient.send('ai-chat', {
						type: 'tool-confirm-result',
						data: { approved: true }
					});
				});
			};
			const onReject = () => {
				import('$lib/client/websocket/index').then(({ wsClient }) => {
					wsClient.send('ai-chat', {
						type: 'tool-confirm-result',
						data: { approved: false }
					});
				});
			};
			ctx.addConfirm(data.name, data.args, onApprove, onReject);
			break;
		}
		default:
			break;
	}
}

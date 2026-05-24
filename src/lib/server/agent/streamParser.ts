import type { WebSocket } from 'ws';
import type { ChatCompletionChunk, ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import type { Stream } from 'openai/streaming.mjs';

export class StreamParser {
	constructor(private ws: WebSocket | undefined) {}

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

	async parse(stream: Stream<ChatCompletionChunk>): Promise<ChatCompletionMessageParam> {
		let textContent = '';
		let reasoningContent = '';
		// map function index -> toolCall
		const toolCallsMap = new Map<number, any>();

		for await (const chunk of stream) {
			const delta = chunk.choices?.[0]?.delta;
			if (!delta) continue;

			// Handle reasoning (O1 / Deepseek models)
			if ((delta as any).reasoning_content) {
				const r = (delta as any).reasoning_content;
				reasoningContent += r;
				this.sendToWs({
					type: 'thinking-chunk',
					data: r
				});
			}

			// Handle normal text
			if (delta.content) {
				textContent += delta.content;
				this.sendToWs({
					type: 'plain-chunk',
					data: delta.content
				});
			}

			// Handle tool calls
			if (delta.tool_calls) {
				for (const toolCall of delta.tool_calls) {
					const index = toolCall.index;
					if (!toolCallsMap.has(index)) {
						toolCallsMap.set(index, {
							id: toolCall.id,
							type: 'function',
							function: {
								name: toolCall.function?.name || '',
								arguments: ''
							}
						});
						this.sendToWs({
							type: 'tool-call-start',
							data: { name: toolCall.function?.name, args: '' }
						});
					}

					const existingCall = toolCallsMap.get(index);
					if (toolCall.function?.arguments) {
						existingCall.function.arguments += toolCall.function.arguments;
					}
				}
			}
		}

		const toolCalls = Array.from(toolCallsMap.values());

		if (toolCalls.length > 0) {
			return {
				role: 'assistant',
				content: textContent || null,
				tool_calls: toolCalls,
				reasoning_content: reasoningContent || null
			} as any;
		}

		return {
			role: 'assistant',
			content: textContent || null,
			reasoning_content: reasoningContent || null
		} as any;
	}
}

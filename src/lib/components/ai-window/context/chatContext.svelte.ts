import type { Component } from 'svelte';
import { ChatBubble } from './chatBubble.svelte';
import Thinking from './thinking.svelte';
import Plain from './plain.svelte';
import ToolCall from './tool-call.svelte';
import Confirm from './confirm.svelte';

export class ChatContext {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public chatList: ChatBubble<Component<any>>[] = $state([]);
	private _handling = $state(false);

	private constructor() { }

	get handling() {
		return this._handling;
	}

	start() {
		this._handling = true;
	}

	end() {
		this._handling = false;
		this.finishLast();
	}

	/**
	 * 获取当前气泡列表中的最后一个气泡
	 */
	getLast() {
		return this.chatList[this.chatList.length - 1];
	}

	/**
	 * 结束当前活动的气泡（将其标记为 done，并取消 pending 状态）
	 */
	private finishLast() {
		const last = this.getLast();
		if (last && last.props && typeof last.props === 'object' && 'done' in last.props) {
			last.props.done = true;
		}
	}

	addPlainChunk(chunk: string) {
		const last = this.getLast();
		if (last && last.type === 'plain') {
			last.props.txt += chunk;
		} else {
			this.finishLast();
			this.chatList.push(ChatBubble.plain(chunk));
		}
	}

	addThinkingChunk(chunk: string) {
		let last = this.getLast();

		// 如果由于大模型流式输出的特性，中间夹杂了空的 plain 气泡（例如只有空格或换行），将其出栈，避免打断 thinking 的合并
		if (last && last.type === 'plain' && last.props.txt.trim() === '') {
			this.chatList.pop();
			last = this.getLast();
		}

		// 多个 thinking chunk 需要合并到同一个气泡中，否则会出现大量短暂的 thinking 气泡
		if (last && last.type === 'thinking') {
			last.props.txt += chunk;
			// 如果该气泡之前已被标记为完成（例如被空的 plain chunk 打断时 finishLast），重新激活它的状态
			// last.pending = true;
			if (last.props && typeof last.props === 'object' && 'done' in last.props) {
				last.props.done = false;
			}
		} else {
			this.finishLast();
			this.chatList.push(ChatBubble.thinking(chunk));
		}
	}

	addToolCall(name: string, args: string) {
		this.finishLast();
		this.chatList.push(ChatBubble.toolCall(name, args));
	}

	finishToolCall(result: string) {
		const last = this.getLast();
		if (last && last.View === ToolCall) {
			last.props.result = result;
			this.finishLast();
		}
	}

	addConfirm(name: string, args: string, onApprove: () => void, onReject: () => void) {
		this.finishLast();

		let bubble: ChatBubble<typeof Confirm> = ChatBubble.confirm(
			name,
			args,
			() => { },
			() => { }
		);

		const approve = () => {
			bubble.props.status = 'approved';
			onApprove();
		};
		const reject = () => {
			bubble.props.status = 'rejected';
			onReject();
		};

		bubble = ChatBubble.confirm(name, args, approve, reject);
		this.chatList.push(bubble);
	}

	static new(): ChatContext {
		return new ChatContext();
	}
}

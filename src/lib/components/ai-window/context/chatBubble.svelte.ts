import type { Component, ComponentProps } from 'svelte';
import UserQuestion from './user-question.svelte';
import * as utils from '$lib/shared/utils';
import Plain from './plain.svelte';
import Thinking from './thinking.svelte';
import ToolCall from './tool-call.svelte';
import Confirm from './confirm.svelte';

type SenderType = 'user' | 'ai';

/**
 * 单条的聊天气泡，包括用户的提问，AI 的回答
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ChatBubble<C extends Component<any, any, any>> {
	id: string = utils.uuid();
	View: C;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	props: ComponentProps<C> = $state() as any;
	sender: SenderType;
	pending: boolean = $state(false);
	replacable: boolean = false;

	constructor(view: C, props: ComponentProps<C>, sender: SenderType, pending: boolean) {
		this.View = view;
		this.props = props;
		this.sender = sender;
		this.pending = pending;
	}

	static fromUser(txt: string, imgs: string[]) {
		return new ChatBubble(UserQuestion, { txt, imgs }, 'user', false);
	}

	static plain(txt: string) {
		return new ChatBubble(Plain, { txt }, 'ai', true);
	}

	static thinking(txt: string = '') {
		return new ChatBubble(Thinking, { txt, done: false }, 'ai', true);
	}

	static toolCall(name: string, args: string) {
		return new ChatBubble(ToolCall, { name, args, done: false, result: '' }, 'ai', true);
	}

	static confirm(name: string, args: string, onApprove: () => void, onReject: () => void) {
		return new ChatBubble(
			Confirm,
			{ name, args, status: 'pending', onApprove, onReject },
			'ai',
			true
		);
	}
}

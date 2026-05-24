<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Bot } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { ChatBubble, ChatContext } from './context';
	import { wsClient } from '$lib/client/websocket/index';
	import UserInput, { focus as focusUserInput, reset as resetUserInput } from './user-input.svelte';
	import ChatListBox from './chat-list-box.svelte';
	import type { RxDataAiChat } from '$lib/client/websocket/model';
	import { subscribeAiChatRx } from './ai-search';
	import Modal from '$lib/components/modal.svelte';

	let open = $state(false);
	let chatContext = $state(ChatContext.new());
	let sessionId = $state('');

	onMount(() => {
		wsClient.connect();

		return wsClient.subscribe('ai-chat', subscribe);
	});

	const subscribe = (payload: RxDataAiChat) => {
		console.debug('接收到 ai-chat 订阅: ', payload);

		if (payload.type === 'end' || payload.type === 'unknow') {
			chatContext.end();
			resetUserInput();
			return;
		}
		subscribeAiChatRx(chatContext, payload);
	};

	function openDialog() {
		if (!open) {
			sessionId = crypto.randomUUID();
			chatContext = ChatContext.new();
		}
		open = true;
		focusUserInput();
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.ctrlKey && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			openDialog();
		}
	}

	function onSend(txt: string, imgs: string[]) {
		chatContext.chatList.push(ChatBubble.fromUser(txt, imgs));
		chatContext.start();

		wsClient.send('ai-chat', {
			type: 'txt-imgs',
			data: {
				sessionId,
				txt,
				imgs
			}
		});
	}
</script>

<svelte:window {onkeydown} />

<label class="input w-50 cursor-pointer ring-offset-2 hover:ring-2">
	<Bot size={32} />
	<input
		type="search"
		class="pointer-events-none grow cursor-pointer"
		placeholder={m.ai_assistant_ask_ai()}
		onclick={openDialog}
	/>
	<kbd class="kbd kbd-sm">⌘</kbd>
	<kbd class="kbd kbd-sm">K</kbd>
</label>

<Modal bind:open className="flex flex-col h-[80vh] w-4xl">
	{#snippet title()}
		🤖{m.ai_assistant()}
	{/snippet}

	{#snippet content()}
		<ChatListBox {chatContext} />

		<UserInput {onSend} />
	{/snippet}
</Modal>

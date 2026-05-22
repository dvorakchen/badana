<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { ChatContext } from './context';

	let { chatContext }: { chatContext: ChatContext } = $props();

	let chatList = $derived.by(() => {
		// 除了最后一个项以外，其他的 replacable 的元素去掉
		return chatContext.chatList.filter((bubble, index) => {
			if (index === chatContext.chatList.length - 1) return true;
			return !bubble.replacable;
		});
	});
</script>

<div class="my-4 max-h-full grow overflow-y-scroll">
	<ul>
		{#each chatList as bubble (bubble.id)}
			<bubble.View {...bubble.props} />
		{/each}
		{#if chatContext.handling}
			<div class="mt-4 flex items-center gap-3">
				<span class="loading w-4 loading-spinner"></span>
				<span class="text-sm opacity-80">{m.ai_assistant_handling()}...</span>
			</div>
		{/if}
	</ul>
</div>

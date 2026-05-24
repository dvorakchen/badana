<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { ChatContext } from './context';

	let { chatContext }: { chatContext: ChatContext } = $props();

	let scrollContainer: HTMLDivElement | undefined = $state();

	let chatList = $derived.by(() => {
		return chatContext.chatList.filter((bubble, index) => {
			if (index === chatContext.chatList.length - 1) return true;
			return !bubble.replacable;
		});
	});

	$effect(() => {
		// Auto scroll on content updates
		// const last = chatList[chatList.length - 1];
		// Create dependencies for the effect to re-run
		// const _txt = (last?.props as any)?.txt;
		// const _res = (last?.props as any)?.result;
		// const _len = chatList.length;

		if (scrollContainer) {
			requestAnimationFrame(() => {
				if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
			});
		}
	});
</script>

<div bind:this={scrollContainer} class="my-4 max-h-full grow overflow-y-auto scroll-smooth px-2">
	<div class="mx-auto flex w-full max-w-4xl flex-col pb-10">
		{#each chatList as bubble (bubble.id)}
			<bubble.View {...bubble.props} />
		{/each}
		{#if chatContext.handling}
			<div class="mt-2 flex items-center gap-3 pb-4 text-base-content/60">
				<span class="loading w-4 loading-spinner"></span>
				<span class="text-sm">{m.ai_assistant_handling()}...</span>
			</div>
		{/if}
	</div>
</div>

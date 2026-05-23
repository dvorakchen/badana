<script module>
	export type ThinkingProps = { txt: string; done?: boolean };
</script>

<script lang="ts">
	let { txt, done = false }: ThinkingProps = $props();
</script>

<details class="group mb-4 max-w-[90%] rounded-lg border border-base-300 bg-base-100/50" open={!done}>
	<summary class="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm text-base-content/70 hover:text-base-content transition-colors">
		<span class="group-open:rotate-90 transition-transform text-xs">▶</span>
		<span class="font-medium">Thinking Process</span>
		{#if !done}
			<span class="loading loading-dots loading-xs ml-2"></span>
		{/if}
	</summary>
	<div class="px-3 pb-3 pt-1 text-xs text-base-content/70 whitespace-pre-wrap leading-relaxed">
		{txt}
	</div>
</details>

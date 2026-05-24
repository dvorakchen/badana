<script module>
	export type ThinkingProps = { txt: string; done?: boolean };
</script>

<script lang="ts">
	let { txt, done = false }: ThinkingProps = $props();
</script>

<details
	class="group mb-4 max-w-[90%] rounded-lg border border-base-300 bg-base-100/50"
	open={!done}
>
	<summary
		class="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm text-base-content/70 transition-colors hover:text-base-content"
	>
		<span class="text-xs transition-transform group-open:rotate-90">▶</span>
		<span class="font-medium">Thinking Process</span>
		{#if !done}
			<span class="loading ml-2 loading-xs loading-dots"></span>
		{/if}
	</summary>
	<div class="px-3 pt-1 pb-3 text-xs leading-relaxed whitespace-pre-wrap text-base-content/70">
		{txt}
	</div>
</details>

<script module>
	export type ToolCallProps = {
		name: string;
		args: string;
		done?: boolean;
		result?: string;
	};
</script>

<script lang="ts">
	let { name, args, done = false, result = '' }: ToolCallProps = $props();
</script>

<details
	class="group mb-4 max-w-[90%] rounded-lg border border-base-300 bg-base-100/50"
	open={!done}
>
	<summary
		class="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm text-base-content/70 transition-colors hover:text-base-content"
	>
		<span class="text-xs transition-transform group-open:rotate-90">▶</span>
		<span class="rounded bg-base-200 px-2 py-0.5 font-mono text-xs font-medium">⚙️ {name}</span>
		{#if !done}
			<span class="loading ml-2 loading-xs loading-spinner"></span>
		{/if}
	</summary>
	<div class="px-3 pt-1 pb-3 text-xs text-base-content/70">
		<div class="mb-1 font-semibold">Arguments:</div>
		<pre class="rounded bg-base-200 p-2 whitespace-pre-wrap">{args}</pre>

		{#if result}
			<div class="mt-2 mb-1 font-semibold">Result:</div>
			<pre
				class="max-h-40 overflow-y-auto rounded bg-base-200 p-2 whitespace-pre-wrap">{result}</pre>
		{/if}
	</div>
</details>

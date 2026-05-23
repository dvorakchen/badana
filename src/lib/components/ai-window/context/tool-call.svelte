<script module>
	export type ToolCallProps = { 
		name: string; 
		args: string; 
		done?: boolean;
		result?: string;
	};
</script>

<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	
	let { name, args, done = false, result = '' }: ToolCallProps = $props();
</script>

<details class="group mb-4 max-w-[90%] rounded-lg border border-base-300 bg-base-100/50" open={!done}>
	<summary class="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm text-base-content/70 hover:text-base-content transition-colors">
		<span class="group-open:rotate-90 transition-transform text-xs">▶</span>
		<span class="font-medium font-mono text-xs bg-base-200 px-2 py-0.5 rounded">⚙️ {name}</span>
		{#if !done}
			<span class="loading loading-spinner loading-xs ml-2"></span>
		{/if}
	</summary>
	<div class="px-3 pb-3 pt-1 text-xs text-base-content/70">
		<div class="font-semibold mb-1">Arguments:</div>
		<pre class="whitespace-pre-wrap bg-base-200 p-2 rounded">{args}</pre>
		
		{#if result}
			<div class="font-semibold mt-2 mb-1">Result:</div>
			<pre class="whitespace-pre-wrap bg-base-200 p-2 rounded max-h-40 overflow-y-auto">{result}</pre>
		{/if}
	</div>
</details>

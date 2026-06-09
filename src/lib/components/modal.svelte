<!-- modal 模态框， -->
<script lang="ts">
	import { X } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';

	let {
		open = $bindable(),
		title,
		content,
		className
	}: {
		open: boolean;
		title?: Snippet;
		content?: Snippet;
		className?: string;
	} = $props();
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center"
		role="dialog"
		transition:fade={{ duration: 100 }}
	>
		<div class="relative z-10 max-w-[90vw] rounded-lg bg-base-100 p-6">
			<div class="flex items-center">
				<h3 class="grow text-xl font-bold">
					{@render title?.()}
				</h3>
				<div>
					<button class="btn btn-circle btn-ghost btn-sm" onclick={() => (open = false)}>
						<X />
					</button>
				</div>
			</div>

			<div class="my-2 py-4 text-lg {className}">{@render content?.()}</div>
		</div>
		<button
			class="absolute inset-0 z-0 h-full w-full bg-gray-950/30"
			onclick={() => (open = false)}
			aria-label="Close dialog"
		></button>
	</div>
{/if}

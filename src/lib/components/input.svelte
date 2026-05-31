<script lang="ts">
	import { X } from '@lucide/svelte';

	let {
		label = '',
		width = '',
		clearable = false,
		value = $bindable('' as string | null),
		...attr
	} = $props();
</script>

<label class="input" style:width>
	{#if label}
		<span class="label">{label}</span>
	{/if}
	<input {...attr} style:width bind:value />
	{#if clearable}
		<button class="label cursor-pointer" onclick={() => (value = '')} type="button">
			<X />
		</button>
	{/if}
</label>

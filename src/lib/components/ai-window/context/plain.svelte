<script module>
	export type PlainProps = { txt: string };
</script>

<script lang="ts">
	import { marked } from 'marked';
	
	let { txt }: PlainProps = $props();
	
	let html = $derived(marked.parse(txt) as string);
</script>

<div class="chat-start chat w-full pb-4">
	<!-- We drop the chat-bubble and background, using prose for rich text -->
	<div class="prose dark:prose-invert max-w-none text-base w-full">
		{@html html}
	</div>
</div>

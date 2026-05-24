<script module>
	export type PlainProps = { txt: string };
</script>

<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'isomorphic-dompurify';

	let { txt }: PlainProps = $props();

	let html = $derived.by(() => {
		const rawHtml = marked.parse(txt) as string;
		return DOMPurify.sanitize(rawHtml);
	});
</script>

<div class="chat-start chat w-full pb-4">
	<!-- We drop the chat-bubble and background, using prose for rich text -->
	<div class="prose w-full max-w-none text-base dark:prose-invert">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html html}
	</div>
</div>

<script module>
	export type UserQuestionProps = {
		txt: string;
		imgs: string[];
	};
</script>

<script lang="ts">
	let { txt }: UserQuestionProps = $props();
</script>

<div class="flex w-full justify-end pb-4">
	<div class="bg-base-200 text-base-content max-w-[85%] rounded-2xl px-5 py-3 shadow-sm whitespace-pre-wrap">
		{txt}
	</div>
</div>

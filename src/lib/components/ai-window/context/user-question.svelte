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
	<div
		class="max-w-[85%] rounded-2xl bg-base-200 px-5 py-3 whitespace-pre-wrap text-base-content shadow-sm"
	>
		{txt}
	</div>
</div>

<script module>
	export type ConfirmProps = {
		name: string;
		args: string;
		status?: 'pending' | 'approved' | 'rejected';
		onApprove?: () => void;
		onReject?: () => void;
	};
</script>

<script lang="ts">
	let { name, args, status = 'pending', onApprove, onReject }: ConfirmProps = $props();
</script>

<div
	class="mb-4 max-w-[90%] overflow-hidden rounded-xl border border-warning/30 bg-warning/5 shadow-sm"
>
	<div class="flex items-center gap-2 border-b border-warning/20 bg-warning/10 px-4 py-2">
		<span class="text-warning">🚨</span>
		<span class="text-sm font-medium text-warning-content">Action Requires Permission</span>
	</div>
	<div class="p-4 text-sm">
		<div class="mb-2 text-base-content/80">The AI wants to execute the following tool:</div>
		<div class="mb-2 inline-block rounded bg-base-200 px-2 py-1 font-mono text-xs">{name}</div>

		<div class="mt-2 mb-1 text-xs font-semibold tracking-wider text-base-content/60 uppercase">
			Arguments:
		</div>
		<pre
			class="mb-4 rounded-lg border border-base-300 bg-base-200 p-3 font-mono text-xs whitespace-pre-wrap">{args}</pre>

		{#if status === 'pending'}
			<div class="mt-4 flex justify-end gap-3">
				<button class="btn text-error btn-ghost btn-sm" onclick={onReject}>Reject</button>
				<button class="btn btn-sm btn-primary" onclick={onApprove}>Approve</button>
			</div>
		{:else}
			<div class="mt-2 flex items-center justify-end gap-2">
				{#if status === 'approved'}
					<span class="badge gap-1 badge-sm badge-success">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-3 w-3"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/></svg
						>
						Approved
					</span>
				{:else}
					<span class="badge gap-1 badge-sm badge-error">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-3 w-3"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/></svg
						>
						Rejected
					</span>
				{/if}
			</div>
		{/if}
	</div>
</div>

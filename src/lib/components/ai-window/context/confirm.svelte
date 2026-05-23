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

<div class="mb-4 max-w-[90%] rounded-xl border border-warning/30 bg-warning/5 overflow-hidden shadow-sm">
	<div class="bg-warning/10 px-4 py-2 border-b border-warning/20 flex items-center gap-2">
		<span class="text-warning">🚨</span>
		<span class="font-medium text-sm text-warning-content">Action Requires Permission</span>
	</div>
	<div class="p-4 text-sm">
		<div class="mb-2 text-base-content/80">The AI wants to execute the following tool:</div>
		<div class="font-mono text-xs bg-base-200 px-2 py-1 rounded inline-block mb-2">{name}</div>
		
		<div class="font-semibold text-xs text-base-content/60 uppercase tracking-wider mb-1 mt-2">Arguments:</div>
		<pre class="whitespace-pre-wrap bg-base-200 p-3 rounded-lg text-xs font-mono mb-4 border border-base-300">{args}</pre>
		
		{#if status === 'pending'}
			<div class="flex gap-3 justify-end mt-4">
				<button class="btn btn-sm btn-ghost text-error" onclick={onReject}>Reject</button>
				<button class="btn btn-sm btn-primary" onclick={onApprove}>Approve</button>
			</div>
		{:else}
			<div class="flex items-center gap-2 justify-end mt-2">
				{#if status === 'approved'}
					<span class="badge badge-success badge-sm gap-1">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
						Approved
					</span>
				{:else}
					<span class="badge badge-error badge-sm gap-1">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
						Rejected
					</span>
				{/if}
			</div>
		{/if}
	</div>
</div>

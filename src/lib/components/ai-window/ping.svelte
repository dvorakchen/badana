<script lang="ts">
	import { http } from '$lib/client/http';
	import { Check, CircleAlert } from '@lucide/svelte';

	import { onMount } from 'svelte';

	let healthCheck: Promise<{ status: 'ok' | 'error' | 'handling' }> = $state(
		Promise.resolve({ status: 'handling' })
	);

	onMount(() => {
		healthCheck = ping();

		const id = setInterval(() => {
			healthCheck = ping();
		}, 60_000);

		return () => {
			clearInterval(id);
		};
	});

	function ping() {
		return http('ai-managment/health-check');
	}
</script>

<div>
	{#await healthCheck}
		<div class="badge gap-2 badge-ghost">
			<span class="loading loading-xs loading-spinner"></span>
			AI 连接检测中...
		</div>
	{:then res}
		{#if res.status === 'ok'}
			<div class="badge gap-2 badge-success">
				<Check size="16" />
				AI 连接正常
			</div>
		{:else if res.status === 'handling'}
			<div class="badge gap-2 badge-warning">
				<span class="loading loading-xs loading-dots"></span>
				AI 连接处理中...
			</div>
		{:else}
			<div class="badge gap-2 badge-error">
				<CircleAlert size="16" />
				AI 连接异常
			</div>
		{/if}
	{:catch}
		<div class="badge gap-2 badge-error">
			<CircleAlert size="16" />
			AI 连接失败
		</div>
	{/await}
</div>

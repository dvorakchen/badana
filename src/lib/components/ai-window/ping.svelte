<script lang="ts">
	import { http } from '$lib/client/http';
	import type { AiProvider } from '$lib/shared';
	import { Check, CircleAlert } from '@lucide/svelte';

	let healthCheck: Promise<{ status: 'ok' | 'error' | 'handling' }> = $state(
		http('ai-managment/health-check')
	);

	let providerList: Promise<AiProvider[]> = $state<Promise<AiProvider[]>>(
		http('ai-managment/providers').then((list: AiProvider[]) => {
			list.length > 0 && (selectedProvider = list[0]);
			return list;
		})
	);

	let selectedProvider = $state<AiProvider | null>(null);

	function handleProviderSelect(provider: AiProvider) {
		selectedProvider = provider;
	}
</script>

<div class="flex items-center">
	<div class="grow">
		{@render pingStatus()}
	</div>
	<div>
		<div class="dropdown dropdown-end">
			<div tabindex="0" role="button" class="btn m-1">提供商：{selectedProvider?.name}</div>
			<ul
				tabindex="-1"
				class="dropdown-content menu z-1 w-52 rounded-box bg-base-100 p-2 shadow-sm"
			>
				{#await providerList}
					<li><span class="loading loading-xs loading-spinner"></span> 加载中...</li>
				{:then providers}
					{#each providers as provider}
						<li>
							<button class="btn btn-ghost" onclick={() => handleProviderSelect(provider)}
								>{provider.name}</button
							>
						</li>
					{/each}
				{/await}
			</ul>
		</div>
	</div>
</div>

{#snippet pingStatus()}
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
{/snippet}

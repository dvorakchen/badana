<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { Bot, Plus, Server, Cpu } from '@lucide/svelte';
	import Modal from '$lib/components/modal.svelte';
	import Input from '$lib/components/input.svelte';
	import DeleteConfirm from '$lib/components/delete-confirm.svelte';
	import { enhance } from '$app/forms';
	import { toastStore } from '$lib/client/store/toast.svelte';
	import Table from '$lib/components/table.svelte';
	import type { AiProvider } from '$lib/server/business/ai-provider';
	import { toDateTime } from '$lib/shared/utils';
	import { http } from '$lib/client/http';
	import { invalidateAll } from '$app/navigation';
	import { AGENT_USED_AI_PROVIDER_NAME } from '$lib/shared/constants.js';

	let { data } = $props();

	let creating = $state(false);
	let updating = $state(null as AiProvider | null);
	let openUpdating = $derived(updating !== null);

	async function handleDelete(id: string) {
		await http(`ai-managment/${id}`, {
			method: 'delete'
		});

		await invalidateAll();
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<header class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<div class="rounded-xl bg-primary/10 p-3 text-primary">
				<Bot size={32} />
			</div>
			<div>
				<h1 class="text-2xl font-bold">AI 管理</h1>
				<p class="text-sm text-base-content/60">管理 AI 提供商配置</p>
			</div>
		</div>
		<button
			class="btn gap-2 btn-primary"
			onclick={() => {
				creating = true;
			}}
		>
			<Plus size={18} />
			添加 Provider
		</button>
	</header>

	<div class="card bg-base-100 shadow-all">
		<div class="card-body p-0">
			<Table
				columns={[
					{ field: 'name', display: '名称' },
					{ field: 'url', display: 'URL' },
					{ field: 'model', display: '模型' },
					{ field: 'apiKey', display: 'Key' },
					{ field: 'createdAt', display: '创建时间' }
				]}
				list={data.providers}
			>
				{#snippet name(row: AiProvider)}
					<div class="flex items-center gap-2">
						<Server size={16} class="text-primary" />
						<span class="font-medium">{row.name}</span>
					</div>
				{/snippet}

				{#snippet url(row: AiProvider)}
					<code class="rounded bg-base-200 px-2 py-0.5 font-mono text-sm break-all">{row.url}</code>
				{/snippet}

				{#snippet model(row: AiProvider)}
					<div class="flex items-center gap-2">
						<Cpu size={14} class="text-base-content/50" />
						<code class="rounded bg-base-200 px-2 py-0.5 font-mono text-sm">{row.model}</code>
					</div>
				{/snippet}

				{#snippet apiKey(row: AiProvider)}
					{row.apiKey}
				{/snippet}

				{#snippet createdAt(row: AiProvider)}
					{toDateTime(row.createdAt)}
				{/snippet}

				{#snippet actions(row: AiProvider)}
					<div class="flex items-center gap-2">
						<button class="btn btn-sm" onclick={() => {
							updating = row;
						}}>修改</button>
						<DeleteConfirm
							size="sm"
							onDelete={() => {
								handleDelete(row.id);
							}}
						/>
					</div>
				{/snippet}
			</Table>
		</div>
	</div>
</div>

<Modal bind:open={creating} className="max-w-lg">
	{#snippet title()}
		添加 AI 提供商
	{/snippet}

	{#snippet content()}
		<form
			method="POST"
			action="?/create"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'success') {
						creating = false;
						toastStore.add('保存成功', 'info');
						await update();
					} else if (result.type === 'failure') {
						toastStore.add((result.data?.message as string) ?? '', 'error');
					}
				};
			}}
			class="space-y-4 pt-4"
		>
			<Input
				label="名称"
				name="name"
				placeholder="如：{AGENT_USED_AI_PROVIDER_NAME}"
				required
				width="100%"
			/>

			<Input
				label="API 地址"
				name="url"
				placeholder="如：https://api.deepseek.com"
				required
				width="100%"
			/>

			<Input label="模型" name="model" placeholder="如：deepseek-v4-pro" required width="100%" />

			<Input label="API Key" name="apiKey" width="100%" required />

			<div class="modal-action">
				<button
					type="button"
					class="btn btn-ghost"
					onclick={() => {
						creating = false;
					}}
				>
					{m.cancel()}
				</button>
				<button type="submit" class="btn btn-primary">{m.confirm()}</button>
			</div>
		</form>
	{/snippet}
</Modal>


<Modal bind:open={openUpdating} className="max-w-lg">
	{#snippet title()}
		修改 AI 提供商
	{/snippet}

	{#snippet content()}
		<form
			method="POST"
			action="?/update"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'success') {
						updating = null;
						toastStore.add('保存成功', 'info');
						await update();
					} else if (result.type === 'failure') {
						toastStore.add((result.data?.message as string) ?? '', 'error');
					}
				};
			}}
			class="space-y-4 pt-4"
		>
			<input type="text" hidden name="id" value={updating!.id} />
			<Input
				label="名称"
				name="name"
				placeholder="如：{AGENT_USED_AI_PROVIDER_NAME}"
				required
				width="100%"
				value={updating!.name}
			/>

			<Input
				label="API 地址"
				name="url"
				placeholder="如：https://api.deepseek.com"
				required
				width="100%"
				value={updating!.url}
			/>

			<Input label="模型" name="model" placeholder="如：deepseek-v4-pro" required width="100%" value={updating!.model} />

			<Input label="API Key" name="apiKey" width="100%" disabled value='不可修改' />

			<div class="modal-action">
				<button
					type="button"
					class="btn btn-ghost"
					onclick={() => {
						updating = null;
					}}
				>
					{m.cancel()}
				</button>
				<button type="submit" class="btn btn-primary">{m.confirm()}</button>
			</div>
		</form>
	{/snippet}
</Modal>

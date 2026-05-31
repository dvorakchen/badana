<script lang="ts">
	import { resolve } from '$app/paths';
	import Table from '$lib/components/table.svelte';
	import type { TeamWithManager } from '$lib/shared';
	import { m } from '$lib/paraglide/messages';
	import { Users, Plus, LayoutGrid, Info, UserCog } from '@lucide/svelte';
	import Modal from '$lib/components/modal.svelte';
	import Input from '$lib/components/input.svelte';
	import { enhance } from '$app/forms';
	import { toastStore } from '$lib/client/store/toast.svelte';
	import { guard } from '$lib/client/permission/attachments/permission-guard.js';

	let { data } = $props();

	type RowType = TeamWithManager & { checked: boolean };

	let list: (TeamWithManager & { checked: boolean })[] = $derived.by(() => {
		return data.teams.map((team: TeamWithManager) => {
			let checked = $state(false);
			return {
				...team,
				get checked() {
					return checked;
				},
				set checked(v) {
					checked = v;
				}
			};
		});
	});

	let isCreateModalOpen = $state(false);
</script>

<div class="flex flex-col gap-6 p-6">
	<!-- Header -->
	<header class="flex flex-wrap items-center justify-between gap-4">
		<div class="flex items-center gap-4">
			<div class="rounded-xl bg-primary/10 p-3 text-primary">
				<Users size={32} />
			</div>
			<div>
				<h1 class="text-2xl font-bold">{m.menu_company_team()}</h1>
				<p class="text-sm text-base-content/60">{m.team_management_desc()}</p>
			</div>
		</div>

		<button
			class="btn gap-2 btn-primary"
			onclick={() => (isCreateModalOpen = true)}
			{@attach guard('TEAM_CREATE')}
		>
			<Plus size={18} />
			{m.create_team()}
		</button>
	</header>

	<!-- Content -->
	<div class="card bg-base-100 shadow-all">
		<div class="card-body p-0">
			<div class="flex items-center justify-between px-6 py-4">
				<h2 class="flex items-center gap-2 font-semibold">
					<LayoutGrid size={18} class="text-primary" />
					{m.menu_company_team()}
				</h2>
			</div>

			<Table
				columns={[
					{
						field: 'name',
						display: m.team_name()
					},
					{
						field: 'manager',
						display: m.manager()
					},
					{
						field: 'memberCount',
						display: m.member_count()
					}
				]}
				{list}
			>
				{#snippet name(team: RowType)}
					<div class="flex flex-col">
						<span class="font-bold">{team.name}</span>
						<span class="text-xs text-base-content/40">{team.id}</span>
					</div>
				{/snippet}

				{#snippet manager(team: RowType)}
					{#if team.manager}
						<div class="flex items-center gap-2">
							<div class="badge badge-outline badge-primary">{team.manager.displayUsername}</div>
						</div>
					{:else}
						<span class="text-base-content/40 italic">{m.not_set()}</span>
					{/if}
				{/snippet}

				{#snippet memberCount(team: RowType)}
					<div class="badge badge-ghost font-mono">{team.memberCount}</div>
				{/snippet}

				{#snippet actions(team: RowType)}
					<a class="btn" href={resolve(`/teams/${team.name}`)}>
						<UserCog size={18} />{m.details()}
					</a>
				{/snippet}
			</Table>
		</div>
	</div>
</div>

<!-- Create Team Modal -->
<Modal bind:open={isCreateModalOpen} className="max-w-md">
	{#snippet title()}
		<div class="flex items-center gap-2">
			<Users size={20} class="text-primary" />
			{m.create_team()}
		</div>
	{/snippet}

	{#snippet content()}
		<form
			method="POST"
			action="?/create"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'success') {
						isCreateModalOpen = false;
						toastStore.add(m.add_success(), 'info');
						await update();
					} else if (result.type === 'failure') {
						toastStore.add((result.data?.message as string) ?? m.update_failed(), 'error');
					}
				};
			}}
			class="space-y-4 pt-4"
		>
			<div class="grid gap-4">
				<section class="space-y-4">
					<h3 class="flex items-center gap-2 text-sm font-semibold text-base-content/70">
						<Info size={16} />
						{m.basic_info()}
					</h3>
					<Input
						label={m.name_zh()}
						name="name"
						placeholder={m.placeholder_team_name()}
						required
						className="w-full"
					/>
				</section>
			</div>

			<div class="modal-action">
				<button type="button" class="btn btn-ghost" onclick={() => (isCreateModalOpen = false)}>
					{m.cancel()}
				</button>
				<button type="submit" class="btn btn-primary">
					{m.confirm()}
				</button>
			</div>
		</form>
	{/snippet}
</Modal>

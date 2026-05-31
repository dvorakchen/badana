<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { guard } from '$lib/client/permission/attachments/permission-guard.js';
	import { http } from '$lib/client/http';
	import { toastStore } from '$lib/client/store/toast.svelte.js';
	import DeleteConfirm from '$lib/components/delete-confirm.svelte';
	import Modal from '$lib/components/modal.svelte';
	import Table from '$lib/components/table.svelte';
	import UserAvatar from '$lib/components/user/user-avatar.svelte';
	import UserPicker from '$lib/components/user/user-picker.svelte';
	import { m } from '$lib/paraglide/messages';
	import { PermissionSchema, type User } from '$lib/shared/index.js';
	import { toDate } from '$lib/shared/utils.js';
	import { MoveLeft, Users, User as UserIcon } from '@lucide/svelte';
	import { FetchError } from 'ofetch';

	let { data } = $props();

	const team = $derived(data.team);
	const members = $derived(
		data.members.sort((a, b) => {
			if (a.id === team.managerId) return -1;
			if (b.id === team.managerId) return 1;
			return 0;
		})
	);

	let edit = $state(false);
	let open = $state(false);

	/**
	 * 选择了用户加入这个部门
	 * @param user
	 */
	async function onPick(users: readonly User[]) {
		if (users.length <= 0) {
			return;
		}

		open = false;
		const userIds = users.map((u) => u.id);
		try {
			await http('teams/join', {
				method: 'post',
				body: {
					teamId: team.id,
					userIds
				}
			});
			toastStore.add(m.add_success(), 'info');
			invalidateAll();
		} catch (e: unknown) {
			if (e instanceof FetchError) {
				toastStore.add(e.data.message, 'error');
			}
			console.error(e);
		}
	}

	async function handleRemove(user: User) {
		try {
			await http('teams/remove', {
				method: 'delete',
				body: {
					teamId: team.id,
					userIds: [user.id]
				}
			});
			toastStore.add(m.remove_success(), 'warning');
		} catch (e: unknown) {
			if (e instanceof FetchError) {
				toastStore.add(e.data.message, 'error');
			}
			console.error(e);
		}
	}

	async function handleSetManager(user: User) {
		try {
			await http('teams/manager', {
				method: 'put',
				body: {
					teamId: team.id,
					managerId: user.id
				}
			});
			toastStore.add(m.update_success(), 'info');
		} catch (e: unknown) {
			if (e instanceof FetchError) {
				toastStore.add(e.data.message, 'error');
			}
			console.error(e);
		}
	}

	async function handleDeleteTeam() {
		try {
			await http(`teams/${team.id}`, {
				method: 'delete'
			});
			toastStore.add(m.update_success(), 'info');
			goto(resolve('/teams'));
		} catch (e: unknown) {
			if (e instanceof FetchError) {
				toastStore.add(e.data.message, 'error');
			}
			console.error(e);
		}
	}
</script>

<div class="mb-6 flex items-center gap-4">
	<a href="/teams" class="btn gap-2 btn-ghost btn-sm">
		<MoveLeft size={18} />
		{m.back_to_list({ name: m.team() })}
	</a>
</div>

{#if team}
	<div class="grid gap-6 md:grid-cols-4">
		<!-- 核心信息卡片 -->
		<div class="card bg-base-100 shadow-all md:col-span-3">
			<div class="card-body">
				<div class="ml-4 grid grid-cols-1 grid-rows-2">
					<h1 class="card-title text-3xl font-bold">{team.name}</h1>
					<p class="mt-2 text-base-content/60">ID: {team.id}</p>
				</div>

				<div class="divider"></div>

				<div class="ml-4 grid gap-4 sm:grid-cols-2">
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-primary/10 p-3 text-primary">
							<UserIcon size={24} />
						</div>
						<div>
							<p class="text-sm text-base-content/60">{m.manager()}</p>
							<p class="font-semibold">{team.manager?.displayUsername || m.not_set()}</p>
						</div>
					</div>

					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-secondary/10 p-3 text-secondary">
							<Users size={24} />
						</div>
						<div>
							<p class="text-sm text-base-content/60">{m.member_count()}</p>
							<p class="font-semibold">{m.person_unit({ count: team.memberCount })}</p>
						</div>
					</div>
				</div>

				<!-- 成员列表部分 -->
				<div class="mt-8">
					<h3 class="mb-4 ml-4 flex items-center gap-2 text-xl font-bold">
						<Users size={20} />
						{m.team_members()}
					</h3>
					{#if edit}
						{@render editMembers()}
					{:else}
						<Table
							columns={[
								{ field: 'member', display: m.member() },
								{ field: 'username', display: m.username() },
								{ field: 'role', display: m.role() }
							]}
							list={members}
						>
							{#snippet member(row: User)}
								<div class="flex items-center gap-3">
									<UserAvatar image={row.image} displayUsername={row.displayUsername ?? ''} />
									<div class="font-bold">{row.displayUsername}</div>
								</div>
							{/snippet}

							{#snippet role(row: User)}
								{#if row.id === team.managerId}
									<div class="badge badge-sm badge-primary">{m.manager()}</div>
								{:else}
									<div class="badge badge-ghost badge-sm">{m.staff()}</div>
								{/if}
							{/snippet}
						</Table>
					{/if}
				</div>
			</div>
		</div>

		<!-- 侧边操作栏 -->
		<div
			class="flex flex-col gap-4"
			{@attach guard(PermissionSchema.any(['TEAM_UPDATE', 'TEAM_DELETE']))}
		>
			<div class="card bg-base-100 shadow-all">
				<div class="card-body">
					<h2 class="card-title text-sm tracking-widest text-base-content/50 uppercase">
						{m.actions()}
					</h2>
					<div class="mt-2 flex flex-col gap-2">
						<!-- <button class="btn btn-outline btn-primary">{m.edit_team_info()}</button> -->
						{#if edit}
							<button class="btn btn-outline" onclick={() => (edit = false)}>{m.cancel()}</button>
						{:else}
							<button
								class="btn btn-outline"
								onclick={() => (edit = true)}
								{@attach guard('TEAM_UPDATE')}>{m.manage_members()}</button
							>
						{/if}

						<div class="divider"></div>
						<div {@attach guard('TEAM_DELETE')}>
							<DeleteConfirm onDelete={handleDeleteTeam} />
						</div>
					</div>
				</div>
			</div>

			<div class="stats stats-vertical bg-base-100 shadow-xl">
				<div class="stat">
					<div class="stat-title">{m.created_at()}</div>
					<div class="stat-value text-sm">
						{toDate(team.createdAt)}
					</div>
				</div>
				<div class="stat">
					<div class="stat-title">{m.last_updated()}</div>
					<div class="stat-value text-sm">
						{team.updatedAt ? toDate(team.updatedAt) : m.never_updated()}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

{#snippet editMembers()}
	<div class="my-4">
		{@render addMembers()}
	</div>
	<Table
		columns={[
			{ field: 'member', display: m.member() },
			{ field: 'username', display: m.username() },
			{ field: 'role', display: m.role() }
		]}
		list={members}
	>
		{#snippet member(row: User)}
			<div class="flex items-center gap-3">
				<UserAvatar image={row.image} displayUsername={row.displayUsername ?? ''} />
				<div class="font-bold">{row.displayUsername}</div>
			</div>
		{/snippet}

		{#snippet role(row: User)}
			{#if row.id === team.managerId}
				<div class="badge badge-sm badge-primary">{m.manager()}</div>
			{:else}
				<div class="badge badge-ghost badge-sm">{m.staff()}</div>
			{/if}
		{/snippet}

		{#snippet actions(row: User)}
			<div class="flex gap-2">
				{#if row.id !== team.managerId}
					<button class="btn btn-outline btn-primary" onclick={() => handleSetManager(row)}
						>{m.set_as_manager()}</button
					>
					<DeleteConfirm label={m.remove_from_team()} onDelete={() => handleRemove(row)} />
				{/if}
			</div>
		{/snippet}
	</Table>
{/snippet}

{#snippet addMembers()}
	<button class="btn btn-primary" onclick={() => (open = true)}>{m.add_member()}</button>
	<Modal bind:open className="min-h-96 w-xl">
		{#snippet title()}
			{m.add_member()}
		{/snippet}

		{#snippet content()}
			<UserPicker excludes={members} {onPick} />
		{/snippet}
	</Modal>
{/snippet}

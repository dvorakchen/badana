<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { i18nFromJSON } from '$lib/shared/utils';
	import { ShieldCheck, Users, ChevronLeft, Save } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import Table from '$lib/components/table.svelte';
	import {
		type User,
		type PermissionValue,
		ROLE_ADMIN_NAME,
		USER_ADMIN_USERNAME
	} from '$lib/shared';
	import UserAvatar from '$lib/components/user/user-avatar.svelte';
	import {
		PERMISSIONS,
		getPermissionLabel,
		PERMISSION_CATEGORY_LABELS
	} from '$lib/shared/permissions';
	import DeleteConfirm from '$lib/components/delete-confirm.svelte';
	import { http } from '$lib/client/http/index.js';
	import { guard } from '$lib/client/permission/attachments/permission-guard.js';
	import { toastStore } from '$lib/client/store/toast.svelte.js';
	import { invalidateAll, goto } from '$app/navigation';
	import { FetchError } from 'ofetch';
	import UserPicker from '$lib/components/user/user-picker.svelte';
	import Modal from '$lib/components/modal.svelte';

	let { data } = $props();

	const role = $derived(data.role);
	const members = $derived(data.members);

	/**
	 * 差异化存储：将“新增”和“移除”的操作分开放置。
	 * 初始值为 []，不引用 props，彻底消除 Svelte 5 的初始化警告。
	 */
	let added = $state<PermissionValue[]>([]);
	let removed = $state<PermissionValue[]>([]);

	let openUserPicker = $state(false);

	/**
	 * 派生出当前的最终权限列表：(原始 - 移除) + 新增
	 */
	let permissions = $derived.by(() => {
		const initial = role.permissions as PermissionValue[];
		return initial.filter((p) => !removed.includes(p)).concat(added);
	});

	const categories = Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[];

	function togglePermission(perm: PermissionValue) {
		const isInitial = (role.permissions as PermissionValue[]).includes(perm);

		if (isInitial) {
			// 如果是原始权限：切换它是否在 removed 数组中
			if (removed.includes(perm)) {
				removed = removed.filter((p) => p !== perm);
			} else {
				removed = [...removed, perm];
			}
		} else {
			// 如果不是原始权限：切换它是否在 added 数组中
			if (added.includes(perm)) {
				added = added.filter((p) => p !== perm);
			} else {
				added = [...added, perm];
			}
		}
	}

	function isChecked(perm: PermissionValue) {
		return permissions.includes(perm);
	}

	function isInitial(perm: PermissionValue) {
		return role.permissions.includes(perm);
	}

	async function handleUpdateRolePermissions() {
		try {
			await http(`roles/${role.id}`, {
				method: 'PUT',
				body: {
					permissions
				}
			});
			toastStore.add(m.update_success(), 'info');
			// 重置差异数组
			added = [];
			removed = [];
			await invalidateAll();
		} catch (e: unknown) {
			if (e instanceof FetchError) {
				toastStore.add(e.data?.message || m.update_failed(), 'error');
			}
		}
	}

	async function handleDeleteRole() {
		try {
			await http(`roles/${role.id}`, {
				method: 'DELETE'
			});
			toastStore.add(m.remove_success(), 'info');
			goto(resolve('/roles'), { replaceState: true });
		} catch (e: unknown) {
			if (e instanceof FetchError) {
				toastStore.add(e.data?.message || m.update_failed(), 'error');
			}
		}
	}

	async function onPick(users: User[]) {
		const list = Array.from(new Set(users.map((t) => t.id).concat(members.map((t) => t.id))));
		await updateUsers(list);
	}

	async function handleRemoveUser(user: User) {
		if (user.username === USER_ADMIN_USERNAME) {
			return;
		}
		const list = members.map((t) => t.id).filter((id) => id !== user.id);
		await updateUsers(list);
	}

	async function updateUsers(userIds: string[]) {
		try {
			await http(`roles/${role.id}/users`, {
				method: 'PUT',
				body: {
					userIds
				}
			});
			await invalidateAll();
			toastStore.add(m.update_success(), 'info');
		} catch (e: unknown) {
			if (e instanceof FetchError) {
				toastStore.add(e.data?.message || m.update_failed(), 'error');
			}
		}
	}
</script>

<div class="flex h-full flex-col gap-6 p-6">
	<!-- Header -->
	<header class="flex items-center justify-between">
		<div class="flex grow items-center gap-4">
			<a href={resolve('/roles')} class="btn btn-circle btn-ghost">
				<ChevronLeft size={24} />
			</a>
			<div class="rounded-xl bg-primary/10 p-3 text-primary">
				<ShieldCheck size={32} />
			</div>
			<div>
				<h1 class="text-2xl font-bold">{i18nFromJSON(role.name)}</h1>
				<p class="font-mono text-sm text-base-content/60 uppercase">{role.id}</p>
			</div>
		</div>
		{#if role.name.default !== ROLE_ADMIN_NAME}
			<div class="flex gap-2">
				<button
					class="btn gap-2 btn-sm btn-primary"
					onclick={handleUpdateRolePermissions}
					{@attach guard('ROLE_UPDATE')}
				>
					<Save size={18} />
					{m.confirm()}
				</button>
				<span {@attach guard('ROLE_DELETE')}>
					<DeleteConfirm size="sm" label={m.delete_role()} onDelete={handleDeleteRole} />
				</span>
			</div>
		{/if}
	</header>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Permissions Management -->
		<div class="space-y-6 lg:col-span-2">
			<section class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="mb-4 card-title">
						<ShieldCheck size={20} class="text-primary" />
						{m.permissions()}
					</h2>

					<div class="space-y-8">
						{#each categories as category (category)}
							<div>
								<h3 class="mb-4 text-sm font-bold tracking-wider text-base-content/50 uppercase">
									{PERMISSION_CATEGORY_LABELS[category]?.() ?? category}
								</h3>
								<div class="ml-2 grid grid-cols-1 gap-4 md:grid-cols-2">
									{#each Object.values(PERMISSIONS[category]) as value (value)}
										<label
											class="label cursor-pointer justify-start gap-4 rounded-lg p-2 transition-colors hover:bg-base-200"
										>
											<input
												type="checkbox"
												class="checkbox checkbox-primary"
												class:checkbox-warning={isInitial(value)}
												checked={isChecked(value as PermissionValue)}
												onchange={() => togglePermission(value as PermissionValue)}
												disabled={role.name.default == ROLE_ADMIN_NAME}
											/>
											<span class="label-text flex flex-col">
												<span class="text-base font-medium"
													>{getPermissionLabel(value as PermissionValue)}</span
												>
												<span class="font-mono text-xs text-base-content/40">{value}</span>
											</span>
										</label>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</section>
		</div>

		<!-- Member List -->
		<div class="space-y-6">
			<section class="card bg-base-100 shadow-xl">
				<div class="card-body p-0">
					<div class="flex p-6 pb-2">
						<h2 class="card-title grow">
							<Users size={20} class="text-primary" />
							{m.member()}
							<span class="ml-2 badge badge-ghost">{members.length}</span>
						</h2>
						<button
							class="btn shadow btn-sm btn-primary"
							{@attach guard('ROLE_UPDATE')}
							onclick={() => (openUserPicker = true)}>{m.add_member()}</button
						>
					</div>

					<Table columns={[{ field: 'name', display: m.username() }]} list={members}>
						{#snippet name(row: User)}
							<div class="flex items-center gap-3">
								<UserAvatar displayUsername={row.displayUsername ?? ''} image={row.image} />
								<div class="flex flex-col">
									<span class="font-medium">{row.displayUsername || row.name}</span>
									<span class="text-xs text-base-content/50">@{row.username}</span>
								</div>
							</div>
						{/snippet}

						{#snippet actions(row: User)}
							<div class="flex items-center gap-2">
								<a href={resolve(`/employee/${row.username}`)} class="btn btn-ghost btn-sm">
									{m.details()}
								</a>
								{#if row.username !== USER_ADMIN_USERNAME}
									<DeleteConfirm
										size="sm"
										onDelete={() => handleRemoveUser(row)}
										{@attach guard('ROLE_DELETE')}
									/>
								{/if}
							</div>
						{/snippet}
					</Table>
				</div>
			</section>
		</div>
	</div>
</div>
<Modal bind:open={openUserPicker} className="min-h-96 w-xl">
	{#snippet title()}
		{m.add_member()}
	{/snippet}

	{#snippet content()}
		<UserPicker excludes={members} {onPick} />
	{/snippet}
</Modal>

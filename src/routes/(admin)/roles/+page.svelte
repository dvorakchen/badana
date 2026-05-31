<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Table from '$lib/components/table.svelte';
	import PermissionViewer from '$lib/components/permission-viewer.svelte';
	import type { Role, PermissionValue } from '$lib/shared';
	import type { RoleWithUserCount } from '$lib/server/business/role';
	import { ShieldCheck, UserCog, Users } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { guard } from '$lib/client/permission/attachments/permission-guard.js';
	import { toDate } from '$lib/shared/utils.js';

	let { data } = $props();

	const roles = $derived(data.roles as RoleWithUserCount[]);
</script>

<div class="flex h-full flex-col gap-6 p-6">
	<header class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="rounded-xl bg-primary/10 p-3 text-primary">
				<ShieldCheck size={32} />
			</div>
			<div>
				<h1 class="text-2xl font-bold">{m.role()}</h1>
				<p class="text-sm text-base-content/60">{m.role_management_desc()}</p>
			</div>
		</div>
		<div>
			<a class="btn btn-primary" href={resolve('/roles/new')} {@attach guard('ROLE_CREATE')}
				>{m.create_role()}</a
			>
		</div>
	</header>

	<div class="card bg-base-100 shadow-xl">
		<div class="card-body">
			<Table
				columns={[
					{ field: 'name', display: m.role() },
					{ field: 'userCount', display: m.member_count() },
					{ field: 'permissions', display: m.permissions() },
					{ field: 'updatedAt', display: m.last_updated() }
				]}
				list={roles}
			>
				{#snippet name(row: Role)}
					<div class="flex flex-col gap-1">
						<span class="font-bold">{row.name}</span>
						<span class="font-mono text-xs text-base-content/40 uppercase"
							>{row.id.slice(0, 8)}</span
						>
					</div>
				{/snippet}

				{#snippet userCount(row: RoleWithUserCount)}
					<div class="flex items-center gap-2">
						<div class="badge gap-2 badge-ghost px-3 py-3">
							<Users size={14} class="text-base-content/60" />
							<span class="font-semibold">{m.person_unit({ count: row.userCount })}</span>
						</div>
					</div>
				{/snippet}

				{#snippet permissions(row: Role)}
					<div class="min-w-lg">
						<details class="collapse border border-base-300 bg-base-100">
							<summary class="collapse-title font-semibold">{m.permissions()}</summary>
							<div class="collapse-content">
								<PermissionViewer permissions={row.permissions as PermissionValue[]} />
							</div>
						</details>
					</div>
				{/snippet}

				{#snippet updatedAt(row: Role)}
					<div class="flex flex-col gap-1 opacity-60">
						<span class="text-sm">{toDate(row.updatedAt)}</span>
					</div>
				{/snippet}

				{#snippet actions(row: Role)}
					<div class="flex gap-2">
						<a class="tooltip btn" href={resolve(`/roles/${row.id}`)} data-tip={m.details()}>
							<UserCog size={18} />{m.details()}
						</a>
					</div>
				{/snippet}
			</Table>
		</div>
	</div>
</div>

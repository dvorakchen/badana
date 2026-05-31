<!-- 用于挑选角色 -->
<script lang="ts">
	import { http } from '$lib/client/http';
	import { m } from '$lib/paraglide/messages';
	import type { Role } from '$lib/shared';
	import { Check, X } from '@lucide/svelte';
	import { onMount } from 'svelte';

	let { roles }: { roles: Role[] } = $props();
	let value = $derived(roles.map((r) => r.id).join(','));

	let allRoles: Role[] = $state([]);
	let restRoles = $derived(allRoles.filter((r) => !roles.some((ur) => ur.id === r.id)));

	onMount(async () => {
		const res: { list: Role[] } = await http('roles');
		allRoles = res.list;
	});
</script>

<div>
	<span class="text-base-content/60">{m.role()}</span>
	<div class="mt-2 flex flex-wrap items-center gap-2">
		<span class="text-sm">{m.assigned_roles()}: </span>

		{#each roles as role (role)}
			<button
				class="btn btn-sm btn-primary"
				type="button"
				onclick={() => (roles = roles.filter((r) => r.id !== role.id))}
			>
				{role.name}
				<X size={12} />
			</button>
		{/each}
	</div>
	<div class="mt-2 flex flex-wrap items-center gap-2">
		<span class="text-sm">{m.unassigned_roles()}: </span>
		{#each restRoles as role (role)}
			<button
				class="btn btn-sm btn-secondary"
				type="button"
				onclick={() => (roles = [...roles, role])}
			>
				{role.name}
				<Check size={12} />
			</button>
		{/each}
	</div>
	<input type="text" hidden name="roles" {value} />
</div>

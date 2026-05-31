<script lang="ts">
	import { enhance } from '$app/forms';
	import { guard } from '$lib/client/permission/attachments/permission-guard.js';
	import Copy from '$lib/components/copy.svelte';
	import UserAvatar from '$lib/components/user/user-avatar.svelte';
	import UserStateBadge from '$lib/components/user/user-state-badge.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toDateTime } from '$lib/shared/utils';
	import { MoveLeft, TriangleAlert } from '@lucide/svelte';
	import type { PageProps } from './$types';
	import Input from '$lib/components/input.svelte';
	import RoleAssigner from '$lib/components/role-assigner.svelte';
	import { toastStore } from '$lib/client/store/toast.svelte';
	import { ADMIN_USERNAME } from '$lib/shared';
	import PermissionViewer from '$lib/components/permission-viewer.svelte';

	let { data }: PageProps = $props();
	let employee = $derived(data.employee);

	let profileLoading = $state(false);
	let edit = $state(false);
</script>

<div class="mb-6 flex items-center gap-4">
	<a class="btn btn-ghost btn-sm" href="/employee">
		<MoveLeft size={18} />
		{m.back_to_list({ name: m.employee() })}
	</a>
	<h1 class="text-2xl font-bold">{m.details()}</h1>
</div>

<div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:grid-rows-2">
	<!-- Profile Card -->
	<div class="card bg-base-100 shadow-all lg:col-span-1">
		<div class="card-body items-center text-center">
			<UserAvatar
				image={employee.image}
				displayUsername={employee.displayUsername ?? ''}
				size="120px"
			/>
			<h2 class="mt-4 card-title text-2xl">
				{employee.displayUsername || employee.username || employee.name}
			</h2>
			<p class="text-base-content/60">
				@{employee.username}
				<UserStateBadge user={employee} />
			</p>

			<div class="flex gap-2">
				{#each data.roles as role (role.id)}
					<div class="badge badge-info">{role.name}</div>
				{/each}
			</div>

			<div class="mt-6 card-actions w-full flex-col gap-2">
				<button
					class="btn w-full btn-outline btn-primary"
					{@attach guard('EMPLOYEE_UPDATE')}
					onclick={() => (edit = true)}
				>
					{m.edit_employee()}
				</button>
				{#if employee.username !== ADMIN_USERNAME}
					<div class="flex gap-4">
						<form
							method="post"
							use:enhance={() => {
								profileLoading = true;

								return async ({ result, update }) => {
									if (result.type === 'failure') {
										toastStore.add((result.data?.message as string) ?? m.update_failed(), 'error');
									}
									await update();
									profileLoading = false;
								};
							}}
						>
							{#if employee.removed}
								<button
									class="btn btn-soft btn-info"
									{@attach guard('EMPLOYEE_RESIGN')}
									formaction="?/hire"
									disabled={profileLoading}
								>
									{m.rehire()}
								</button>
							{:else}
								<button
									class="btn btn-soft btn-error"
									{@attach guard('EMPLOYEE_RESIGN')}
									formaction="?/resign"
									disabled={profileLoading}
								>
									{m.resign()}
								</button>
							{/if}

							{#if employee.banned}
								<button
									class="btn btn-soft btn-info"
									{@attach guard('EMPLOYEE_BAN')}
									formaction="?/unban"
									disabled={profileLoading}
								>
									{m.unban()}
								</button>
							{:else}
								<button
									class="btn btn-soft btn-error"
									{@attach guard('EMPLOYEE_BAN')}
									formaction="?/ban"
									disabled={profileLoading}
								>
									{m.ban()}
								</button>
							{/if}
						</form>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Details Card -->
	<div class="flex flex-col gap-4 lg:col-span-2">
		{#if edit}
			<!-- Details Card -->
			<div class="card bg-base-100 shadow-all">
				<form
					class="card-body"
					method="post"
					action="?/update"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'failure') {
								toastStore.add((result.data?.message as string) ?? m.update_failed(), 'error');
							} else {
								edit = false;
							}
							await update();
						};
					}}
				>
					<h3 class="text-lg font-semibold">{m.details()}</h3>
					<div class="divider mt-0"></div>

					<input type="text" name="userId" value={employee.id} hidden />
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<span class="text-base-content/60">{m.username()}</span>
							<div class="px-1 text-lg font-medium">{employee.username}</div>
						</div>

						<div>
							<Input
								label={m.display_name()}
								name="displayName"
								value={employee.displayUsername || ''}
								required
							/>
						</div>

						<div>
							<Input label={m.email()} name="email" value={employee.email || ''} required />
						</div>

						<div>
							<Input label={m.phone()} name="phone" value={employee.phoneNumber || ''} required />
						</div>
					</div>

					{#if employee.banned}
						<div class="mt-6 alert alert-error shadow-sm">
							<TriangleAlert />
							<div>
								<h3 class="font-bold">{m.banned_status()}</h3>
								<div class="text-xs">
									{m.account_banned({ reason: employee.banReason || m.no_reason() })}
								</div>
								<div class="text-xs">
									{m.unban_time()}: {employee.banExpires
										? toDateTime(employee.banExpires)
										: m.forever()}
								</div>
							</div>
						</div>
					{/if}

					<div class="mt-6">
						<RoleAssigner roles={data.roles} />
					</div>

					<div class="flex justify-end gap-4">
						<button class="btn btn-primary">{m.confirm()}</button>
						<button class="btn btn-secondary" type="button" onclick={() => (edit = false)}
							>{m.cancel()}</button
						>
					</div>
				</form>
			</div>
		{:else}
			<div class="card bg-base-100 shadow-all">
				<div class="card-body">
					<h3 class="text-lg font-semibold">{m.details()}</h3>
					<div class="divider mt-0"></div>

					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<span class="text-base-content/60">{m.username()}</span>
							<div class="px-1 text-lg font-medium">{employee.username}</div>
						</div>

						<div>
							<span class="text-base-content/60">{m.display_name()}</span>
							<div class="px-1 text-lg font-medium">{employee.displayUsername || m.not_set()}</div>
						</div>

						<div>
							<span class="text-base-content/60">{m.email()}</span>
							<div class="px-1 text-lg font-medium">
								<a class="btn btn-link" href="mailto:{employee.email}">{employee.email}</a>
								<Copy text={employee.email} />
							</div>
						</div>

						<div>
							<span class="text-base-content/60">{m.phone()}</span>
							<div class="px-1 text-lg font-medium">{employee.phoneNumber || m.not_set()}</div>
						</div>

						<div>
							<span class="text-base-content/60">{m.created_at()}</span>
							<div class="px-1 text-lg font-medium">{toDateTime(employee.createdAt)}</div>
						</div>

						<div>
							<span class="text-base-content/60">{m.last_updated()}</span>
							<div class="px-1 text-lg font-medium">
								{employee.updatedAt ? toDateTime(employee.updatedAt) : m.never_updated()}
							</div>
						</div>
					</div>

					{#if employee.banned}
						<div class="mt-6 alert alert-error shadow-sm">
							<TriangleAlert />
							<div>
								<h3 class="font-bold">{m.banned_status()}</h3>
								<div class="text-xs">
									{m.account_banned({ reason: employee.banReason || m.no_reason() })}
								</div>
								<div class="text-xs">
									{m.unban_time()}: {employee.banExpires
										? toDateTime(employee.banExpires)
										: m.forever()}
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
			<!-- 权限 -->
		{/if}
		<div class="card bg-base-100 shadow-all lg:col-span-2">
			<div class="card-body">
				<h3 class="text-lg font-semibold">{m.permissions()}</h3>
				<div class="divider mt-0"></div>

				<PermissionViewer permissions={data.permissions} />
			</div>
		</div>
	</div>
</div>

<script lang="ts">
	import { ChevronUp } from '@lucide/svelte';
	import { userStore } from '$lib/client/store/user.svelte';
	import { authClient } from '$lib/client/auth';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import UserAvatar from '$lib/components/user/user-avatar.svelte';
	import { i18nFromJSON } from '$lib/shared/utils';
	import { themeStore } from '$lib/client/store/theme.svelte';

	async function handleLogout() {
		await authClient.signOut();
		userStore.clear();
		goto(resolve('/login'));
	}
</script>

<div class="bg-base-100 px-2 pb-2">
	<div
		class="dropdown dropdown-end dropdown-top w-full rounded-lg"
		data-theme={themeStore.currentTheme}
	>
		<div tabindex="0" role="button" class="btn h-full w-full px-3 py-1 shadow-all btn-ghost">
			<div class="grid w-full grid-cols-[auto_1fr_auto] items-center gap-2 gap-x-4 gap-y-1">
				<!-- 头像 -->
				<div class="col-start-1 row-span-2 items-center justify-center">
					<UserAvatar
						image={userStore.user?.image}
						displayUsername={userStore.user?.displayUsername ?? ''}
						size="3rem"
					/>
				</div>
				<!-- 用户名 -->
				<div class="col-start-2 row-start-1 min-w-0 self-end text-start text-lg font-bold">
					<h3 class="truncate">{userStore.user?.displayUsername ?? ''}</h3>
				</div>
				<!-- 用户邮箱 -->
				<div class="col-start-2 row-start-2 min-w-0 self-start text-start text-sm font-light">
					<address class="truncate">{userStore.user?.email ?? ''}</address>
				</div>
				<!-- 箭头 -->
				<div class="col-start-3 row-span-2 row-start-1">
					<ChevronUp size={32} stroke="3px" />
				</div>
			</div>
		</div>
		<ul
			tabindex="-1"
			class="dropdown-content menu z-1 mb-2 w-full rounded-box border border-base-200 bg-base-100 shadow-all"
		>
			<li>
				<div class="flex">
					<h1 class="truncate text-lg font-bold">{userStore.user?.displayUsername}</h1>
					<span class="flex grow justify-end truncate">
						{userStore.teams.map((t) => i18nFromJSON(t.name)).join(', ')}
					</span>
				</div>
			</li>
			<address class="mx-3">
				{userStore.user?.email}
			</address>
			<li class="pointer-events-none divider h-px"></li>
			<li>
				<button class="btn btn-wide btn-soft btn-sm btn-error" onclick={handleLogout}>Logout</button
				>
			</li>
		</ul>
	</div>
</div>

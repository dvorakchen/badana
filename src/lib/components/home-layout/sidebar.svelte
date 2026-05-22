<!-- 
Sidebar component for the admin dashboard.
	 
侧边栏组件，用于显示 Logo、导航菜单和当前登录的用户
三类信息上下排列	  
-->

<script lang="ts">
	import logo from '$lib/assets/logo/logo-64x64.webp';
	import { m } from '$lib/paraglide/messages';
	import { resolve } from '$app/paths';
	import MenuList, { type MenuListDateType } from './menu-list.svelte';
	import UserCard from './user-card.svelte';
	import { GitFork, LayoutDashboard } from '@lucide/svelte';
	import { PermissionSchema } from '$lib/shared';
	import { hasPermissions } from '$lib/client/permission/attachments/permission-guard';
	import { themePrefer } from '$lib/client/store/theme.svelte';

	const menuList: MenuListDateType[] = [
		{
			topTitle: m.menu_overview(),
			menu: [
				{
					Icon: LayoutDashboard,
					label: m.menu_overview_dashboard(),
					link: resolve('/')
				}
			]
		},
		{
			topTitle: m.menu_hrm(),
			menu: [
				{
					label: m.menu_hrm_employee(),
					Icon: LayoutDashboard,
					links: [
						{ label: m.employee_list(), link: resolve('/employee') },
						{ label: 'Submenu 2', link: '/1' }
					],
					permissions: PermissionSchema.all(['EMPLOYEE_READ'])
				},
				{
					label: m.menu_hrm_leave(),
					Icon: LayoutDashboard,
					links: [
						{ label: 'Submenu 1', link: '/1' },
						{ label: 'Submenu 2', link: '/1' }
					]
				}
			]
		},
		{
			topTitle: '系统管理',
			menu: [
				{
					label: '角色管理',
					Icon: LayoutDashboard,
					link: resolve('/roles')
				},
				{
					label: 'AI 管理',
					Icon: LayoutDashboard,
					links: [
						{ label: 'Submenu 1', link: '/1' },
						{ label: 'Submenu 2', link: '/1' }
					]
				}
			]
		},
		{
			topTitle: m.menu_company(),
			menu: [
				{
					Icon: GitFork,
					label: m.menu_company_team(),
					link: resolve('/teams'),
					permissions: PermissionSchema.any(['TEAM_READ'])
				}
			]
		},
		{
			topTitle: '设置',
			menu: [
				{
					label: '设置1',
					Icon: LayoutDashboard,
					links: [
						{ label: 'Submenu 1', link: '/1' },
						{ label: 'Submenu 2', link: '/1' }
					]
				},
				{
					label: '设置2',
					Icon: LayoutDashboard,
					links: [
						{ label: 'Submenu 1', link: '/1' },
						{ label: 'Submenu 2', link: '/1' }
					]
				}
			]
		}
	];
</script>

<aside class="flex h-full flex-col pb-2" data-theme={themePrefer.dark}>
	<header class="sticky top-0 z-10 p-2">
		<a class="mx-2 flex gap-4 rounded-xl p-2 hover:bg-base-200" href={resolve('/')}>
			<!-- Home icon -->
			<img src={logo} alt="Logo" class="max-h-10 max-w-10" />
			<div class="flex flex-col">
				<h1 class="text-lg font-bold">{m.title()}</h1>
				<span class="text-sm text-nowrap">{m.admin_dashboard()}</span>
			</div>
		</a>
	</header>

	<div class="mb-8 grow">
		{#each menuList as menu (menu.topTitle)}
			{#if menu.permissions}
				{#await hasPermissions(menu.permissions) then value}
					{#if value}
						<MenuList topTitle={menu.topTitle} menu={menu.menu}></MenuList>
					{/if}
				{/await}
			{:else}
				<MenuList topTitle={menu.topTitle} menu={menu.menu}></MenuList>
			{/if}
		{/each}
	</div>

	<div class="sticky bottom-0">
		<UserCard />
	</div>
</aside>

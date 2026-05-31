import { RoleService } from '$lib/server/business/role';
import { UserService } from '$lib/server/business/user';
import { PermissionSchema } from '$lib/shared/permissions';
import { m } from '$lib/paraglide/messages';
import { container } from 'tsyringe';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { logger } from '$lib/server/logger';

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const { user } = locals;
		const userService = container.resolve(UserService);
		const roleService = container.resolve(RoleService);

		// 权限检查
		if (
			!user ||
			!(await userService.hasPermissions(user.id, PermissionSchema.any(['ROLE_CREATE'])))
		) {
			return fail(403, { message: m.no_permission() });
		}

		const formData = await request.formData();
		const nameZh = formData.get('nameZh')?.toString().trim();
		const nameEn = formData.get('nameEn')?.toString().trim();
		const permissionsJson = formData.get('permissions')?.toString();

		if (!nameZh || !nameEn) {
			return fail(400, { message: m.field_required({ name: m.role() }) });
		}

		if (await roleService.isRoleNameTaken(nameZh)) {
			return fail(400, { message: m.field_taken({ name: m.role() }) });
		}

		let permissions: string[];
		try {
			permissions = permissionsJson ? JSON.parse(permissionsJson) : [];
		} catch (e: unknown) {
			logger.error(e);
			return fail(400, { message: m.invalid_request() });
		}

		const role = await roleService.createRole({
			name: nameZh,
			permissions
		});

		throw redirect(303, `/roles/${role.id}`);
	}
};

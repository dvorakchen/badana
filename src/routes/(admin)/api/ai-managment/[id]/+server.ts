import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { container } from 'tsyringe';
import { UserService } from '$lib/server/business/user';
import { PermissionSchema } from '$lib/shared';
import { m } from '$lib/paraglide/messages';
import { AiProviderService } from '$lib/server/business/ai-provider';

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { user } = locals;
	const userService = container.resolve(UserService);

	if (
		!user ||
		!(await userService.hasPermissions(user.id, PermissionSchema.any(['ROLE_UPDATE'])))
	) {
		error(403, { message: m.no_permission() });
	}

	const id = params.id;

	const service = container.resolve(AiProviderService);
	await service.delete(id);

	return json({}, { status: 200 });
};

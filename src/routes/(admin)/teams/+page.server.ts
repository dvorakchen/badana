import type { PageServerLoad, Actions } from './$types';
import { TeamService } from '$lib/server/business/team';
import { container } from 'tsyringe';
import { fail } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages';
import { logger } from '$lib/server/logger';

export const load: PageServerLoad = async () => {
	const teamService = container.resolve(TeamService);
	const page = await teamService.getPaginatedTeams();

	return {
		teams: page.list
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name') as string;

		if (!name) {
			return fail(400, { message: m.missing_field({ name: m.team_name() }) });
		}

		const teamService = container.resolve(TeamService);
		try {
			await teamService.createTeam({
				name: name
			});
			return { success: true };
		} catch (e: unknown) {
			if (e instanceof Error) {
				if (e.message === 'TEAM_NAME_TAKEN') {
					return fail(400, { message: m.field_taken({ name: m.team_name() }) });
				}
			}

			logger.error(e);
			return fail(500, { message: m.unexpected_error() });
		}
	}
};

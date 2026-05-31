import type { PageServerLoad, Actions } from './$types';
import { container } from 'tsyringe';
import { AiProviderService } from '$lib/server/business/ai-provider';
import { fail } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';

export const load: PageServerLoad = async () => {
	const service = container.resolve(AiProviderService);
	const providers = await service.getAll();

	return {
		providers: providers.map((p) => ({
			...p,
			apiKey: '' // 不回传 apiKey 到客户端
		}))
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const name = (data.get('name') as string)?.trim();
		const url = (data.get('url') as string)?.trim();
		const model = (data.get('model') as string)?.trim();
		const apiKey = (data.get('apiKey') as string)?.trim();

		if (!name || !url || !model) {
			return fail(400, { message: '名称、地址和模型不能为空' });
		}

		const service = container.resolve(AiProviderService);
		try {
			await service.create({ name, url, model, apiKey: apiKey || '' });
			return { success: true };
		} catch (e) {
			logger.error(e);
			return fail(500, { message: '创建失败' });
		}
	}
};

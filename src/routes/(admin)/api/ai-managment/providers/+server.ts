import { json, type RequestHandler } from '@sveltejs/kit';
import { container } from 'tsyringe';
import { AiProviderService } from '$lib/server/business/ai-provider';

export const GET: RequestHandler = async () => {
    const providerService = container.resolve(AiProviderService);
    const list = await providerService.getAll();
    list.forEach(item => {
        item.apiKey = '';
    });

    return json(list);
};

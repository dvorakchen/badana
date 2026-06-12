import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { container } from 'tsyringe';
import { AgentService } from '$lib/server/agent';

export const GET: RequestHandler = async () => {
	const agentService = container.resolve(AgentService);
	await agentService.setup();

	if (await agentService.ping()) {
		return json({ status: 'ok' }, { status: 200 });
	} else {
		return json({ status: 'error', message: '无法连接到 AI 服务，请检查配置' }, { status: 500 });
	}
};

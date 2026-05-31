import { container } from 'tsyringe';
import { AiDbService, NormalDbService } from '$lib/server/db';
import { logger } from '$lib/server/logger';
import { ToolRegistry } from '$lib/server/agent/tool-registry';
import { registerAllTools } from '$lib/server/agent/tools';
import { AiProviderService } from '$lib/server/business/ai-provider';

export function setupContainer() {
	container.register('NormalDbService', {
		useClass: NormalDbService
	});
	logger.info('DI registered NormalDbService');

	container.register('AiDbService', {
		useClass: AiDbService
	});
	logger.info('DI registered AiDbService');

	container.register('AiProviderService', {
		useClass: AiProviderService
	});
	logger.info('DI registered AiProviderService');

	const toolRegistry = container.resolve(ToolRegistry);
	registerAllTools(toolRegistry);
	logger.info('DI registered ToolRegistry with all tools');
}

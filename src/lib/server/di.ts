import { container } from 'tsyringe';
import { AiDbService, NormalDbService } from '$lib/server/db';
import { logger } from '$lib/server/logger';
import { ToolRegistry } from '$lib/server/agent/tool-registry';
import { registerAllTools } from '$lib/server/agent/tools';

export function setupContainer() {
	container.register('NormalDbService', {
		useClass: NormalDbService
	});
	logger.info('DI registered NormalDbService');

	container.register('AiDbService', {
		useClass: AiDbService
	});
	logger.info('DI registered AiDbService');

	const toolRegistry = container.resolve(ToolRegistry);
	registerAllTools(toolRegistry);
	logger.info('DI registered ToolRegistry with all tools');
}

import { container } from 'tsyringe';
import { AiDbService, NormalDbService } from '$lib/server/db';
import { logger } from '$lib/server/logger';

export function setupContainer() {
    container.register('NormalDbService', {
        useClass: NormalDbService
    });
    logger.info('DI registered NormalDbService');

    container.register('AiDbService', {
        useClass: AiDbService
    });
    logger.info('DI registered AiDbService');
}
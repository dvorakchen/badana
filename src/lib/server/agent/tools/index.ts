import type { ToolRegistry } from '../tool-registry';
import { getCurrentTimeTool } from './base-time';
import { searchToolsTool } from './search-tools';
import { searchDb } from './db-search';
import { describeDatabase } from './describe-database';

export function registerAllTools(registry: ToolRegistry): void {
	registry.register(getCurrentTimeTool);
	registry.register(searchToolsTool);
	registry.register(searchDb);
	registry.register(describeDatabase);
}

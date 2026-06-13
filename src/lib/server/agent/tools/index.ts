import type { ToolRegistry } from '../tool-registry';
import { getCurrentTimeTool } from './base-time';
import { searchDb } from './db-search';
import { listSkillsTool } from './list-skills';
import { loadSkillTool } from './load-skill';
import { createTeamsTool } from './create-teams';
import { updateTeamsTool } from './update-teams';

export function registerAllTools(registry: ToolRegistry): void {
	registry.register(getCurrentTimeTool);
	registry.register(searchDb);
	registry.register(listSkillsTool);
	registry.register(loadSkillTool);
	registry.register(createTeamsTool);
	registry.register(updateTeamsTool);
}

import { singleton } from 'tsyringe';
import type { ChatCompletionFunctionTool } from 'openai/resources/index.mjs';
import type { User } from '$lib/shared';

export interface ToolExecuteContext {
	user: User;
	/**
	 * 只读数据库实例（drizzle 实例），工具可通过此属性执行 SELECT 查询。
	 * 类型为 unknown 避免 tool-registry 与 db 模块直接耦合，
	 * 具体工具内部自行 cast 为实际类型使用。
	 */
	db: DbService['db'];
}

export interface ToolEntry {
	name: string;
	definition: ChatCompletionFunctionTool;
	execute: (args: Record<string, unknown>, ctx: ToolExecuteContext) => Promise<string> | string;
	searchKeywords: string[];
	tags: string[];
	category: string;
}

export interface ToolExecutionResult {
	toolResults: ChatCompletionToolMessageParam[];
	newToolNames: string[];
}

import type { ChatCompletionToolMessageParam } from 'openai/resources/index.mjs';
import type { DbService } from '$lib/server/db';

@singleton()
export class ToolRegistry {
	private tools = new Map<string, ToolEntry>();

	register(entry: ToolEntry): void {
		this.tools.set(entry.name, entry);
	}

	search(query: string): ToolEntry[] {
		if (!query.trim()) return [];

		const q = query.toLowerCase();
		const scored: { entry: ToolEntry; score: number }[] = [];

		for (const entry of this.tools.values()) {
			if (entry.tags.includes('base')) continue;

			let score = 0;
			if (entry.name.toLowerCase().includes(q)) score += 10;
			for (const kw of entry.searchKeywords) {
				if (kw.toLowerCase().includes(q)) score += 5;
			}
			for (const tag of entry.tags) {
				if (tag.toLowerCase().includes(q)) score += 3;
			}
			if (entry.definition.function.description?.toLowerCase().includes(q)) score += 1;

			if (score > 0) {
				scored.push({ entry, score });
			}
		}

		scored.sort((a, b) => b.score - a.score);
		return scored.slice(0, 10).map((s) => s.entry);
	}

	getDefinition(name: string): ChatCompletionFunctionTool | undefined {
		return this.tools.get(name)?.definition;
	}

	getDefinitions(names: Iterable<string>): ChatCompletionFunctionTool[] {
		const defs: ChatCompletionFunctionTool[] = [];
		for (const name of names) {
			const def = this.getDefinition(name);
			if (def) defs.push(def);
		}
		return defs;
	}

	getExecutor(
		name: string
	):
		| ((args: Record<string, unknown>, ctx: ToolExecuteContext) => Promise<string> | string)
		| undefined {
		return this.tools.get(name)?.execute;
	}

	getBaseToolNames(): string[] {
		const names: string[] = [];
		for (const entry of this.tools.values()) {
			if (entry.tags.includes('base')) {
				names.push(entry.name);
			}
		}
		return names;
	}
}

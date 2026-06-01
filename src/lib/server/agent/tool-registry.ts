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
	/** 是否是基础工具，是的话一开始就在 AI tools 上下文里 */
	base: boolean;
	/** 该工具是否要在前端显示调用过程 */
	isDisplay: boolean;
}
import type { DbService } from '$lib/server/db';

@singleton()
export class ToolRegistry {
	private tools = new Map<string, ToolEntry>();

	register(entry: ToolEntry): void {
		this.tools.set(entry.name, entry);
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

	getTool(name: string) {
		return this.tools.get(name);
	}

	getBaseToolNames(): string[] {
		const names: string[] = [];
		for (const entry of this.tools.values()) {
			if (entry.base) {
				names.push(entry.name);
			}
		}
		return names;
	}
}

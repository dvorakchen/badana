import type { DbService } from '$lib/server/db';
import { aiProvider } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { inject, injectable } from 'tsyringe';
import type { InferSelectModel } from 'drizzle-orm';
import { AGENT_USED_AI_PROVIDER_NAME } from '$lib/shared';

export type AiProvider = InferSelectModel<typeof aiProvider>;

export type CreateProviderInput = {
	name: string;
	url: string;
	model: string;
	apiKey: string;
};

export type UpdateProviderInput = Partial<CreateProviderInput>;

@injectable()
export class AiProviderService {
	constructor(@inject('NormalDbService') private dbService: DbService) {}

	private get db() {
		return this.dbService.db;
	}

	/**
	 * 获取所有 Provider
	 */
	async getAll(): Promise<AiProvider[]> {
		return await this.db.query.aiProvider.findMany({
			orderBy: (table, { asc }) => asc(table.createdAt)
		});
	}

	/**
	 * 根据 ID 获取单个 Provider
	 */
	async getById(id: string): Promise<AiProvider | null> {
		const result = await this.db.query.aiProvider.findFirst({
			where: eq(aiProvider.id, id)
		});
		return result ?? null;
	}

	/**
	 * 根据 ID 获取单个 Provider
	 */
	async getDefault(): Promise<AiProvider | null> {
		const result = await this.db.query.aiProvider.findFirst({
			where: eq(aiProvider.name, AGENT_USED_AI_PROVIDER_NAME)
		});
		return result ?? null;
	}

	/**
	 * 创建 Provider
	 */
	async create(data: CreateProviderInput): Promise<AiProvider> {
		const [inserted] = await this.db.insert(aiProvider).values(data).returning();
		return inserted;
	}

	/**
	 * 更新 Provider
	 */
	async update(id: string, data: UpdateProviderInput): Promise<void> {
		await this.db.update(aiProvider).set(data).where(eq(aiProvider.id, id));
	}

	/**
	 * 删除 Provider
	 */
	async delete(id: string): Promise<void> {
		if ((await this.getById(id)) === null) {
			return;
		}
		await this.db.delete(aiProvider).where(eq(aiProvider.id, id));
	}
}

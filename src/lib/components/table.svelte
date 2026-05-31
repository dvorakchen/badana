<script module>
	import type { Snippet } from 'svelte';

	/**
	 * 一行的数据类型
	 */
	export type Row<T> = {
		/**
		 * 该行是否被选中
		 */
		checked: boolean;
		/**
		 * 行数据
		 */
		row: T;
	};

	export type Col = {
		field: string;
		display: string;
	};

	export type RowList<T> = Row<T>[];

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export interface TableProps<T = any> {
		/**
		 * 是否使用在列头使用 checkbox
		 */
		checkable?: boolean;
		columns: Col[];
		list: T[];
		actions?: Snippet<[T]>;
		// 允许传入任意名称的 Snippet，每个 Snippet 接收 T 类型的数据
		// 这里的 any 是为了兼容 columns 和 list 等非 Snippet 属性
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		[key: string]: Snippet<[T]> | any;
	}
</script>

<script lang="ts">
	let { checkable, columns, list, actions, ...snippets }: TableProps = $props();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let rows: RowList<any> = $derived.by(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return list.map((item: any) => {
			let checked = $state(false);
			return {
				get checked() {
					return checked;
				},
				set checked(v) {
					checked = v;
				},
				row: item
			};
		});
	});

	let hasActions = $derived(!!actions);
	let isAllChecked = $derived(rows.length > 0 && rows.every((t) => t.checked));

	function toggleAll(e: Event) {
		const checked = (e.target as HTMLInputElement).checked;
		rows.forEach((t) => (t.checked = checked));
	}
</script>

<div class="overflow-x-auto">
	<table class="table">
		<!-- head -->
		<thead>
			<tr>
				{#if checkable}
					<th>
						<label>
							<input type="checkbox" class="checkbox" checked={isAllChecked} onchange={toggleAll} />
						</label>
					</th>
				{/if}
				{#each columns as col (col)}
					<th>{col.display}</th>
				{/each}

				{#if hasActions}
					<th></th>
				{/if}
			</tr>
		</thead>
		<tbody>
			{#each rows as row, i (i)}
				{@const rowData = row.row}

				<tr class="hover:bg-base-300">
					{#if checkable}
						<td>
							<label>
								<input type="checkbox" class="checkbox" bind:checked={row.checked} />
							</label>
						</td>
					{/if}
					{#each columns as col (col)}
						<td>
							{#if snippets[col.field]}
								{@render snippets[col.field](rowData)}
							{:else}
								{rowData[col.field] ?? ''}
							{/if}
						</td>
					{/each}

					{#if hasActions}
						<td>
							{@render actions?.(rowData)}
						</td>
					{/if}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

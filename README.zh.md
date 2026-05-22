# Badana

基于 SvelteKit 5 + Better Auth + Drizzle ORM 构建的全栈应用模板，集成了响应式 WebSocket 服务和完整的 Docker 部署方案。

## 🌟 特性

- **SvelteKit 5 (Runes)**: 利用最新符文系统实现极致的响应式性能。
- **Better Auth**: 强大的身份验证方案，支持邮件/密码、手机号登录。
- **Drizzle ORM**: 类型安全的数据库操作，支持迁移与自动生成。
- **WebSocket 架构**:
  - **开发环境**: Vite 插件实现 HMR 与业务 WS 路径分流。
  - **生产环境**: 自定义 Node.js 服务器，实现高性能 WS 支持。
- **Docker 化部署**: 预设多阶段构建 Dockerfile 及完善的 Compose 配置。

## 🚀 快速开始

### 1. 环境准备

复制环境变量模板并填入必要配置：

```bash
cp .env.example .env
```

### 2. 开发环境启动

```bash
pnpm install
pnpm dev
```

访问地址: `http://localhost:5173`
_WebSocket 地址: `ws://localhost:5173/ws`_

### 3. 数据库操作

```bash
pnpm db:push      # 同步模型到数据库
pnpm db:studio    # 开启可视化数据库管理
```

## 🐳 Docker 生产部署

项目已针对 Docker 进行了深度优化。只需一条命令即可启动应用与数据库：

```bash
docker compose up --build -d
```

默认访问地址: `http://127.0.0.1:3000`

### 关键环境变量

生产环境下，必须确保以下变量在 `compose.yaml` 中正确配置：

- `ORIGIN`: SvelteKit 身份识别地址（必须，解决 CSRF 校验）。
- `BETTER_AUTH_URL`: Better Auth 基础路径。
- `PUBLIC_ORIGIN`: 客户端 WebSocket 连接的基础地址。
- `ADMIN_DATABASE_URL`: 生产环境数据库连接串。

## 🛠️ 技术架构细节

### WebSocket 实现

项目采用了“路径分流”方案（Path Separation）。所有业务 WebSocket 连接统一请求 `/ws` 路径，从而避免在开发环境下与 Vite 的 HMR 热更新服务产生冲突。

### 生产环境入口 (server.js)

不同于标准的 `node build`，我们使用自定义的 `server.js` 作为入口。它手动挂载了 WebSocket 服务并将 HTTP 请求分发给 SvelteKit Handler，确保在 `adapter-node` 部署下 WS 依然可用。

## 📜 许可证

Apache-2.0

# 开发手册

> 当要进行二次开发的时候，应该参考以下手册

## 数据库

使用 PostgreSQL，高度使用了 PG 数据库特有的能力，如`行内安全`，日期使用 `timestampz` 格式，方便记录时区信息

如果你要使用其他数据库，可能会遇到不兼容的情况，需要自行调整

## i18n

使用的 `paraglide` 提供的方案。默认有中文 zh，英文 en 两种语言，有需要添加其他语言，推荐使用 AI 参考 `messages/{en,zh}.json` 翻译为其他语言，如 `de`，然后在 `project.inlang/settings.json` 中的 `locales` 中添加上新的语言，如 `de`

数据库中的 i18n 使用了 JSON 格式

```ts
export type DbI18nField =
	| {
			/**
			 * 当没有区域指定的文本时候，默认显示这个文本
			 */
			default: string;
			/**
			 * 区域文本
			 *
			 * zh: 中文
			 * en: English
			 */
			[K: string]: string;
	  }
	| { [K: string]: string };
```

会以 JSON 格式存在数据库字段中，在客户端使用 `i18nFromJSON(DbI18nField)` 在客户端中提取出当前时区对应的文本

## 路由守卫

在 `hooks.server.ts` 的 `handleRouteProtected` 配置哪些 API 是不需要登录验证的

## 依赖注入

依赖注入框架使用的是 `tsyringe`，具体用法参考文档

示例：

```ts
@injectable()
export class UserService {
	doWork() {}
}

const userService = container.resolve(UserService);
userService.doWork();

class RoleService {
	constructor(@inject('NormalDbService') private dbService: DbService) {}
}
```

## 样式

使用 `DaisyUI`

## 组件(Components)

### table.svelte

在客户端显示表格推荐使用 `table.svelte` 组件

示例：

```svelte
<Table
	checkable={true}
	columns={[
		{
			field: 'name',
			display: `Team Name`
		},
		{
			field: 'manager',
			display: 'Manager'
		},
		{
			field: 'memberCount',
			display: 'Member Count'
		}
	]}
	{list}
>
	{#snippet name(row: RowType)}
		{i18nFromJSON(row.name)}
	{/snippet}

	{#snippet manager(row: RowType)}
		{row.manager?.displayUsername}
	{/snippet}

	{#snippet actions(row: RowType)}
		<a class="btn" href={resolve(`/detail/${row.id}`)}>详情</a>
	{/snippet}
</Table>

```

在表格中要显示列，传入 `columns`:

```ts
export type Col = {
	// 列字段，组件会使用这个字段在 list 中拿到对应的数据
	field: string;
	// 列显示的名字
	display: string;
};
```

表格的列表数据传入 `list`:

```ts
type list: T[]
```

如:

```svelte
<table
	columns={[
		{
			field: 'name',
			display: `Team Name`
		},
		{
			field: 'manager',
			display: 'Manager'
		},
		{
			field: 'memberCount',
			display: 'Member Count'
		}
	]}
	list={[
		{ name: 'Dev', manager: 'Alex', memberCount: '10' },
		{ name: 'Resource', manager: 'Bab', memberCount: '5' }
	]}
></table>
```

默认情况下，在 `name` 这一列，会展示 `list` 那一行数据的 `name` 的值来展示

也可以通过传入 `Snippet` 改变默认的展示行为

```svelte
<table
	columns={[
		{
			field: 'name',
			display: `Team Name`
		},
		{
			field: 'manager',
			display: 'Manager'
		},
		{
			field: 'memberCount',
			display: 'Member Count'
		}
	]}
	list={[
		{ name: 'Dev', manager: 'Alex', memberCount: '10' },
		{ name: 'Resource', manager: 'Bab', memberCount: '5' }
	]}
>
  <!-- 当展示 manager 的时候，会使用下面的 Snippet -->
   <!-- 原本展示 Alex，现在展示 Bad Alex -->
  {#snippet manager(row: RowType)}
		{'Bad ' + row.manager}
	{/snippet}
</table>
```

但是 `actions` Snippet 是保留的，所以在列中不要使用 `actions` 这个 field

给 `table` 传入 `checkable` 可以在表格左侧显示复选框

```svelte
<table checkable={true}></table>
```

使用 `actions` Snippet 在每行最右侧显示操作按钮

```svelte
<table>
  <!--
  ...
  -->
	{#snippet actions(row: RowType)}
		<a class="btn" href={resolve(`/detail/${row.id}`)}>详情</a>
    <button>删除</button>
	{/snippet}
</table>
```

### 输入框

建议使用 Components 里的 `Input` 二次开发

```svelte
<!-- 一个空白的输入框 -->
<Input />
<!-- value 是响应式的 -->
<Input {value} />
<!-- 输入框内左侧显示一个标签 -->
<Input label={'标签'} />
<!-- 右侧显示一个用于清除内容的 X 按钮 -->
<Input clearable />
<!-- 可以映射任意属性到内部的 input 上 -->
<Input name="username" type="number" data-tip="Tip" />
```

### 模态框

模态框使用 `modal.svelte`

```svelte
<script lang="ts">
	let open = $state(false);
</script>

<!-- open 用户控制显示或者不显示，当模态框不显示的时候，会卸载模态框 -->
<!-- className 里直接指定 content 的样式 -->
<Modal bind:open className="grid ...">
	<!-- title snippet 是模态框的标题 -->
	{#snippet title()}
		Title
	{/snippet}

	<!-- content snippet 是模态框的内容 -->
	{#snippet content()}
		内容！
	{/snippet}
</Modal>
```

### 删除确认框

删除需要确认，使用 `delete-confirm.svelte`

```svelte
<DeleteConfirm
	size="sm"
	label={'删除按钮'}
	confirmLabel={'确认删除'}
	onDelete={() => {
		'删除函数';
	}}
/>

其他需要确认的危险操作按钮都可以使用这个组件
```

### 用户头像 (UserAvatar)

`UserAvatar` 组件用于显示用户头像或占位图。

```svelte
<!-- 显示头像图片 -->
<UserAvatar image="https://example.com/avatar.png" displayUsername="张三" size="40px" />

<!-- 显示首字母占位图 -->
<UserAvatar displayUsername="Admin" size="32px" />
```

- `image`: (可选) 头像图片的 URL。
- `displayUsername`: (必填) 用户的显示名称。
- `size`: (可选) 头像的 CSS 宽高，默认为 `32px`。

## 权限

定义的权限是写死在代码里的，意味着你不能凭空变出一个全新的权限

权限在 `shared/permissions.ts` 的 `PERMISSIONS` 中定义，在 `PERMISSION_LABELS` 中设置权限 i18n 的映射

使用 `getPermissionLabel(permission)` 来获取本地化后的权限文本

## 测试

建议组件测试和单元测试都使用 `.spec.ts` 扩展名，没什么原因就是统一

导入 `vitest/browser` 而不是已废弃的 `@vitest/browser/context`

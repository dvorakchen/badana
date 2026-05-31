# Badana

A full-stack application template built on SvelteKit 5 + Better Auth + Drizzle ORM, integrating a reactive WebSocket service and a complete Docker deployment solution.

## 🌟 Features

- **SvelteKit 5 (Runes)**: Utilizes the latest runes system for ultimate reactive performance.
- **Better Auth**: Powerful authentication solution supporting email/password and phone number login.
- **Drizzle ORM**: Type-safe database operations with support for migrations and schema generation.
- **WebSocket Architecture**:
  - **Development**: Vite plugin implements HMR and separates business WS routes.
  - **Production**: Custom Node.js server for high-performance WS support.
- **Dockerized Deployment**: Pre-configured multi-stage Dockerfile and comprehensive Compose configuration.

## 🚀 Quick Start

### 1. Environment Preparation

Copy the environment variable template and fill in the necessary configuration:

```bash
cp .env.example .env
```

### 2. Start Development Environment

```bash
pnpm install
pnpm dev
```

Access URL: `http://localhost:5173`
_WebSocket URL: `ws://localhost:5173/ws`_

### 3. Database Operations

```bash
pnpm db:push      # Sync schema to the database
pnpm db:studio    # Start visual database management
```

## 🐳 Docker Production Deployment

The project is highly optimized for Docker. Start the application and database with a single command:

```bash
docker compose up --build -d
```

Default access URL: `http://127.0.0.1:3000`

### Key Environment Variables

In production, ensure the following variables are correctly configured in `compose.yaml`:

- `ORIGIN`: SvelteKit identity URL (Required to resolve CSRF checks).
- `BETTER_AUTH_URL`: Better Auth base path.
- `PUBLIC_ORIGIN`: Base URL for client WebSocket connections.
- `ADMIN_DATABASE_URL`: Production database connection string.

## 🛠️ Technical Architecture Details

### WebSocket Implementation

The project uses a "Path Separation" approach. All business WebSocket connections request the `/ws` path uniformly, avoiding conflicts with Vite's HMR service in the development environment.

### Production Entry (server.js)

Unlike standard `node build`, we use a custom `server.js` as the entry point. It manually mounts the WebSocket server and routes HTTP requests to the SvelteKit Handler, ensuring WS remains available under the `adapter-node` deployment.

## 📜 License

Apache-2.0

# Development Manual

> When undertaking secondary development, refer to the following manual.

## Database

Uses PostgreSQL and heavily utilizes PG-specific capabilities, such as `Row-Level Security`. Dates use the `timestampz` format to conveniently record timezone information.

If you plan to use a different database, you may encounter incompatibilities and will need to make manual adjustments.

## i18n

Uses the solution provided by `paraglide`. The defaults include Chinese (zh) and English (en). If you need to add other languages, we recommend using AI to reference `messages/{en,zh}.json` and translate it into other languages, such as `de`. Then, add the new language to the `locales` array in `project.inlang/settings.json`.

## Route Guards

Configure which APIs do not require login verification in `handleRouteProtected` within `hooks.server.ts`.

## Dependency Injection

The dependency injection framework used is `tsyringe`. Refer to its documentation for specific usage.

Example:

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

## Styling

Uses `DaisyUI`

## Components

### table.svelte

It is recommended to use the `table.svelte` component to display tables on the client side.

Example:

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
		{row.name}
	{/snippet}

	{#snippet manager(row: RowType)}
		{row.manager?.displayUsername}
	{/snippet}

	{#snippet actions(row: RowType)}
		<a class="btn" href={resolve(`/detail/${row.id}`)}>Details</a>
	{/snippet}
</Table>

```

To display columns in the table, pass `columns`:

```ts
export type Col = {
	// Column field, the component will use this field to get the corresponding data in the list
	field: string;
	// Column display name
	display: string;
};
```

Pass the table list data to `list`:

```ts
type list: T[]
```

For example:

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

By default, the `name` column will display the value of `name` from the row data in `list`.

You can also change the default display behavior by passing a `Snippet`:

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
  <!-- When displaying manager, the snippet below will be used -->
   <!-- Originally displayed Alex, now displays Bad Alex -->
  {#snippet manager(row: RowType)}
		{'Bad ' + row.manager}
	{/snippet}
</table>
```

However, the `actions` Snippet is reserved, so do not use the `actions` field in your columns.

Pass `checkable={true}` to `table` to display checkboxes on the left side of the table.

```svelte
<table checkable={true}></table>
```

Use the `actions` Snippet to display operation buttons on the far right of each row:

```svelte
<table>
  <!--
  ...
  -->
	{#snippet actions(row: RowType)}
		<a class="btn" href={resolve(`/detail/${row.id}`)}>Details</a>
    <button>Delete</button>
	{/snippet}
</table>
```

### Input

It is recommended to use the `Input` component from Components for secondary development.

```svelte
<!-- An empty input box -->
<Input />
<!-- value is reactive -->
<Input {value} />
<!-- Display a label on the left side inside the input box -->
<Input label={'Label'} />
<!-- Display an X button on the right to clear content -->
<Input clearable />
<!-- Any attributes can be mapped to the internal input -->
<Input name="username" type="number" data-tip="Tip" />
```

### Modal

Use `modal.svelte` for modals.

```svelte
<script lang="ts">
	let open = $state(false);
</script>

<!-- open controls whether to display or not. When the modal is not displayed, it is unmounted -->
<!-- Specify content styles directly in className -->
<Modal bind:open className="grid ...">
	<!-- title snippet is the title of the modal -->
	{#snippet title()}
		Title
	{/snippet}

	<!-- content snippet is the content of the modal -->
	{#snippet content()}
		Content!
	{/snippet}
</Modal>
```

### Delete Confirmation

Deletions require confirmation, use `delete-confirm.svelte`.

```svelte
<DeleteConfirm
	size="sm"
	label={'Delete Button'}
	confirmLabel={'Confirm Delete'}
	onDelete={() => {
		'Delete function';
	}}
/>

Any other dangerous operation buttons requiring confirmation can also use this component.
```

### User Avatar (UserAvatar)

The `UserAvatar` component is used to display user avatars or placeholders.

```svelte
<!-- Display avatar image -->
<UserAvatar image="https://example.com/avatar.png" displayUsername="Zhang San" size="40px" />

<!-- Display initial placeholder -->
<UserAvatar displayUsername="Admin" size="32px" />
```

- `image`: (Optional) The URL of the avatar image.
- `displayUsername`: (Required) The user's display name.
- `size`: (Optional) The CSS width and height of the avatar, defaults to `32px`.

## Permissions

Defined permissions are hardcoded in the codebase, meaning you cannot spawn a completely new permission out of nowhere.

Permissions are defined in `PERMISSIONS` within `shared/permissions.ts`, and the i18n mappings for permissions are set in `PERMISSION_LABELS`.

Use `getPermissionLabel(permission)` to get the localized permission text.

## Testing

It is recommended to use the `.spec.ts` extension for both component tests and unit tests, just for consistency.

Import `vitest/browser` instead of the deprecated `@vitest/browser/context`.

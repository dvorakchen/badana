import 'reflect-metadata';

import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { auth, checkIsLoggedIn } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { redirect, type Handle } from '@sveltejs/kit';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { logger } from '$lib/server/logger';
import { runMigrations, seed } from '$lib/server/db/seed';
import { initWebSocket } from '$lib/server/websocket';
import { APIError } from 'better-auth/api';
import { setupContainer } from '$lib/server/di';

/**
 * 处理路由保护的 Handle。这个 Handle 会在每个请求前检查用户是否已登录，除非请求的路径在 anonymousPaths 中。
 */
const handleRouteProtected: Handle = ({ event, resolve }) => {
	const pathname = new URL(event.request.url).pathname;

	// 1. 放行所有被 better-auth 接管的底层 API 路由
	if (pathname.startsWith('/api/auth/')) {
		return resolve(event);
	}

	// 2. 放行纯粹的公共页面（您提到只有登录界面不需要登录，如果首页 /
	if (pathname === '/login' || pathname === '/') {
		return resolve(event);
	}

	if (pathname.indexOf('/__data.json') !== -1) {
		return resolve(event); // 直接处理这些路径
	}

	const user = event.locals.user;
	const session = event.locals.session;
	if (!checkIsLoggedIn(user, session)) {
		return redirect(302, '/login');
	}

	return resolve(event);
};

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('%paraglide.lang%', locale)
					.replace('%paraglide.dir%', getTextDirection(locale))
		});
	});

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	try {
		const session = await auth.api.getSession({ headers: event.request.headers });

		if (session) {
			event.locals.session = session.session;
			event.locals.user = session.user;
		}
	} catch (e) {
		if (e instanceof APIError) {
			// 如果是 APIError，说明是业务逻辑拦截（如 banned）
			// 我们在这里不处理，让后面的 svelteKitHandler 再次执行并正确返回 Response
			logger.warn(`APIError caught in hooks: ${e.message}`);
		} else {
			logger.error(e, 'Error in getSession hook');
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

const handleLog: Handle = async ({ event, resolve }) => {
	const start = performance.now();
	const response = await resolve(event);

	const time = performance.now() - start;

	// 记录所有请求日志
	logger.info(
		{
			method: event.request.method,
			url: event.url.pathname,
			status: response.status,
			time: `${time.toFixed(2)}ms`
		},
		'Incoming Request'
	);

	return response;
};

// 全局错误捕获
export const handleError = ({ error, event }) => {
	logger.error(
		{
			err: error,
			url: event.url.pathname
		},
		'Uncaught Server Error'
	);
};

export const handle: Handle = sequence(
	handleLog,
	handleBetterAuth,
	handleRouteProtected,
	handleParaglide
);

if (!building) {
	setupContainer()
	await runMigrations();
	await seed();

	initWebSocket();
}

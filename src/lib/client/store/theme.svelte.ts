export const themePrefer = {
	light: 'cmyk',
	dark: 'sunset'
} as const;

const IS_DARK_KEY = 'isdark';

class ThemeStore {
	constructor() {
		this._isDark = JSON.parse(localStorage.getItem(IS_DARK_KEY) ?? 'false');

		this.changeTheme();
	}

	private _isDark = $state(false);

	public currentTheme = $derived(this._isDark ? themePrefer.dark : themePrefer.light);
	public toggle(): void {
		this._isDark = !this._isDark;
		localStorage.setItem(IS_DARK_KEY, JSON.stringify(this._isDark));
		this.changeTheme();
	}

	private changeTheme(): void {
		document.documentElement.dataset.theme = this.currentTheme;
	}
}

export function initThemeStore() {
	themeStore = new ThemeStore();
}

export let themeStore: ThemeStore;

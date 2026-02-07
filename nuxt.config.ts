export default defineNuxtConfig({
	modules: [
		'@nuxt/eslint',
		'@nuxt/ui',
		'@vueuse/nuxt',
		'@nuxtjs/mdc'
	],

	ui: {
		theme: {
			colors: ['claude']
		}
	},

	mdc: {
		highlight: {
			theme: {
				default: 'github-light',
				dark: 'github-dark'
			},
			langs: ['js', 'ts', 'vue', 'css', 'html', 'bash', 'sh', 'json', 'yaml', 'md', 'python', 'go', 'sql']
		}
	},

	devtools: { enabled: true },

	components: [
		{ path: '~/components', pathPrefix: false }
	],

	css: ['~/assets/css/main.css'],

	routeRules: {
		'/api/**': { cors: false }
	},

	devServer: {
		host: '127.0.0.1',
		port: 3200
	},

	runtimeConfig: {
		claudeHomePath: '',
		anthropicApiKey: ''
	},

	compatibilityDate: '2025-01-01',

	eslint: {
		config: {
			stylistic: {
				commaDangle: 'never',
				braceStyle: '1tbs',
				indent: 'tab'
			}
		}
	}
})

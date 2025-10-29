/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  darkMode: ["class", "class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  container: {
    center: true,
    padding: "2rem",
    screens: {
      xs: "425px",
      "2xl": "1400px",
    },
  },
  theme: {
  	screens: {
            ...defaultTheme.screens,
  		xs: '425px'
  	},
  	fontFamily: {
  		body: [
  			'Inter'
  		]
  	},
  	fontSize: {
  		xs: '0.75rem',
  		xsm: '0.813rem',
  		sm: '0.875rem',
  		base: '1rem',
  		lg: '1.125rem',
  		xl: '1.25rem',
  		'2xl': '1.5rem',
  		'3xl': '1.875rem',
  		'4xl': '2.25rem',
  		'5xl': '3rem',
  		'6xl': '4rem',
  		'tremor-label': [
  			'0.75rem'
  		],
  		'tremor-default': [
  			'0.875rem',
  			{
  				lineHeight: '1.25rem'
  			}
  		],
  		'tremor-title': [
  			'1.125rem',
  			{
  				lineHeight: '1.75rem'
  			}
  		],
  		'tremor-metric': [
  			'1.875rem',
  			{
  				lineHeight: '2.25rem'
  			}
  		]
  	},
  	extend: {
  		keyframes: {
  			marquee: {
  				'0%': {
  					transform: 'translateX(0%)'
  				},
  				'100%': {
  					transform: 'translateX(-50%)'
  				}
  			}
  		},
  		animation: {
  			marquee: 'marquee 30s linear infinite'
  		},
  		colors: {
  			brand: {
  				blue: '#4C6FFF',
  				darkblue: '#101828',
  				gray: '#344054',
  				lightblue: '#EEF4FF',
  				black: '#18181B'
  			},
			general: {
				primary: '#171717'
			},
  			warning: {
  				'50': '#fffbeb',
  				'700': '#b45309'
  			},
  			neutral: {
  				'100': '#F7F9FB',
  				'600': '#404968'
  			},
  			tremor: {
  				brand: {
  					faint: '#eff6ff',
  					muted: '#bfdbfe',
  					subtle: '#60a5fa',
  					DEFAULT: '#3b82f6',
  					emphasis: '#1d4ed8',
  					inverted: '#ffffff'
  				},
  				background: {
  					muted: '#f9fafb',
  					subtle: '#f3f4f6',
  					DEFAULT: '#ffffff',
  					emphasis: '#374151'
  				},
  				border: {
  					DEFAULT: '#e5e7eb'
  				},
  				ring: {
  					DEFAULT: '#e5e7eb'
  				},
  				content: {
  					subtle: '#9ca3af',
  					DEFAULT: '#6b7280',
  					emphasis: '#374151',
  					strong: '#111827',
  					inverted: '#ffffff'
  				}
  			},
  			primary: {
  				'50': 'customColors("--c-primary-50")',
  				'100': 'customColors("--c-primary-100")',
  				'200': 'customColors("--c-primary-200")',
  				'300': 'customColors("--c-primary-300")',
  				'400': 'customColors("--c-primary-400")',
  				'500': 'customColors("--c-primary-500")',
  				'600': 'customColors("--c-primary-600")',
  				'700': 'customColors("--c-primary-700")',
  				'800': 'customColors("--c-primary-800")',
  				'900': 'customColors("--c-primary-900")',
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			boxShadow: {
  				'tremor-input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  				'tremor-card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  				'tremor-dropdown': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  				'dark-tremor-input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  				'dark-tremor-card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  				'dark-tremor-dropdown': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
  			},
  			borderRadius: {
  				'tremor-small': '0.375rem',
  				'tremor-default': '0.5rem',
  				'tremor-full': '9999px'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  safelist: [
    {
      pattern:
        /^(bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"],
    },
    {
      pattern:
        /^(text-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"],
    },
    {
      pattern:
        /^(border-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"],
    },
    {
      pattern:
        /^(ring-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern:
        /^(stroke-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern:
        /^(fill-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
  ],
  plugins: [
    require("@tailwindcss/typography"),
    require("postcss-nesting"),
    require("@tailwindcss/forms"),
      require("tailwindcss-animate")
],
};

import type { Config } from 'tailwindcss';
export default { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'], theme: { extend: { colors: { ink: '#07101f', panel: '#0c172a', line: '#1b2a43', electric: '#3e9cff', gold: '#eabf42', success: '#56cf8c', danger: '#ff655e' }, boxShadow: { glow: '0 0 28px rgba(62,156,255,.14)' } } }, plugins: [] } satisfies Config;

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@taskflow/config/tailwind/preset')],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/app-kit/src/**/*.{ts,tsx}',
  ],
};

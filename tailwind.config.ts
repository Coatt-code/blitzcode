/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],           // or "selector" in Tailwind v4 (both work)
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
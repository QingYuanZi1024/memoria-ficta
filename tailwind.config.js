/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Parchment / aged paper palette
        parchment: {
          50: "#fdfaf2",
          100: "#f7f0dd",
          200: "#ede2c0",
          300: "#dbc998",
        },
        ink: {
          900: "#1a1410",
          800: "#2a1f1a",
          700: "#3d2f25",
          500: "#6b5648",
          400: "#8a7765",
          300: "#a89684",
        },
        wax: {
          // Red wax seal accent
          DEFAULT: "#9b3027",
          dark: "#6f1f18",
        },
      },
      fontFamily: {
        serif: ['"EB Garamond"', "Garamond", "Caslon", "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

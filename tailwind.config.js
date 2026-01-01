/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "var(--primary-start)",
        accent: "var(--accent)",
        page: {
          DEFAULT: "var(--bg-start)",
        },
        card: "var(--card-start)",
        text: "var(--text)",
      },
    },
  },
  plugins: [],
};

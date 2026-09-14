/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        cairo: ["Cairo", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#123F63",
          hover: "#0B2D47",
          light: "#E8EEF4",
        },
      },
    },
  },
  plugins: [],
};

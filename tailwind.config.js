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
          DEFAULT: "#0B3D66",
          hover: "#092F4F",
          light: "#E8F0F7",
        },
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        cairo: ["Cairo", "sans-serif"],
      },
      colors: {
        // Brand navy — used for primary actions, links, active states
        primary: "#123F63",
        "primary-hover": "#0B2D47",
        "primary-dark": "#0A2436",
        "primary-light": "#E8EEF4",
        // Warm gold — the single accent, reused for "pending" states
        accent: "#B0820F",
        "accent-light": "#FBF3E1",
        // Status
        success: "#16803C",
        "success-light": "#EAF7F0",
        danger: "#C0392B",
        "danger-light": "#FBEAE8",
        // Neutrals — one warm-gray family, one source of truth
        ink: "#16202B",
        "ink-soft": "#5B6875",
        "ink-faint": "#96A1AC",
        line: "#E4E8EC",
        "line-soft": "#EEF1F4",
        page: "#F7F8FA",
        surface: "#FFFFFF",
        // The neutral backdrop shown outside the centered app frame on md+ screens
        backdrop: "#EEF1F5",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(18, 63, 99, 0.04), 0 1px 1px 0 rgba(18, 63, 99, 0.03)",
        raised: "0 12px 24px -8px rgba(18, 63, 99, 0.18)",
        shell: "0 24px 60px -20px rgba(10, 36, 54, 0.28)",
      },
    },
  },
  plugins: [],
};

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
        "primary-bright": "#2E6DA4",
        // Warm gold — the single accent, reused for "pending" states
        accent: "#B0820F",
        "accent-light": "#FBF3E1",
        // Status
        success: "#16803C",
        "success-light": "#EAF7F0",
        danger: "#C0392B",
        "danger-light": "#FBEAE8",
        // Service category colors — one restrained, cohesive fintech palette
        violet: "#6D5AE0",
        "violet-light": "#EFECFC",
        teal: "#0E9C97",
        "teal-light": "#E1F5F3",
        rose: "#DD5C82",
        "rose-light": "#FCEBF1",
        cyan: "#1596C7",
        "cyan-light": "#E4F3FA",
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
      keyframes: {
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        // Kept for pages not yet migrated to the new design system
        // (AppointmentBookingPage, DeclarationPage, EmployeeDashboardPage,
        // TransactionsPage, EmployerDashboardPage, NotificationsPage,
        // ProfilePage). Remove once every page uses animate-rise-in instead.
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "rise-in": "rise-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in": "scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 2.5s linear infinite",
        "fade-in-up": "fade-in-up 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        brand: {
          navy: {
            50: "#E8ECF4",
            100: "#C6CFE0",
            200: "#95A5C4",
            300: "#647AA8",
            400: "#3D5691",
            500: "#1B2A4A",
            600: "#15213B",
            700: "#101A2E",
            800: "#0C1423",
            900: "#080E19",
          },
          gold: {
            50: "#FBF8F1",
            100: "#F3EAD7",
            200: "#E7D6B0",
            300: "#DAC289",
            400: "#CFB068",
            500: "#C9A96E",
            600: "#B0935E",
            700: "#8C7449",
            800: "#685535",
            900: "#453923",
          },
        },
        semantic: {
          success: "#12B76A",
          warning: "#F79009",
          danger: "#E5484D",
          info: "#2E90FA",
        },
      },
      fontFamily: {
        display: ['"Noto Serif SC"', '"Source Han Serif SC"', "serif"],
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', "sans-serif"],
      },
      boxShadow: {
        "gold-sm": "0 1px 2px 0 rgba(201, 169, 110, 0.15)",
        "gold-md": "0 4px 12px -2px rgba(201, 169, 110, 0.25)",
        "gold-lg": "0 12px 24px -4px rgba(201, 169, 110, 0.35)",
        "navy-md": "0 4px 16px -2px rgba(27, 42, 74, 0.25)",
        card: "0 1px 3px 0 rgba(27, 42, 74, 0.08), 0 1px 2px -1px rgba(27, 42, 74, 0.06)",
      },
      backgroundImage: {
        "navy-gradient":
          "linear-gradient(135deg, #1B2A4A 0%, #0C1423 100%)",
        "gold-gradient":
          "linear-gradient(135deg, #E7D6B0 0%, #C9A96E 50%, #8C7449 100%)",
        "danger-gradient":
          "linear-gradient(135deg, #FEE4E2 0%, #E5484D 100%)",
        "card-gradient":
          "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)",
      },
      animation: {
        "pulse-border": "pulseBorder 2s ease-in-out infinite",
        "fade-in-up": "fadeInUp 0.4s ease-out",
        "slide-in-right": "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        pulseBorder: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(229, 72, 77, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(229, 72, 77, 0)" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

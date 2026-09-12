import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design tokens from requirements.md design spec
        accent: {
          DEFAULT: "#6366f1", // indigo-500
          hover: "#4f46e5", // indigo-600
        },
        granted: "#10b981", // emerald-500
        revoked: "#f43f5e", // rose-500
      },
      fontSize: {
        // 12/14/16/20/24 scale
        xs: "0.75rem",
        sm: "0.875rem",
        base: "1rem",
        lg: "1.25rem",
        xl: "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;

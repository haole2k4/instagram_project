/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ig: {
          ground: "#000000",
          surface: "#111111",
          raised: "#2a2a2a",
          border: "#1a1a1a",
          rule: "#161616",
          control: "#444444",
          text: "#ffffff",
          muted: "#b4b4b4",
          faint: "#949494",
          accent: "#0095f6",
          like: "#ff3040",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        logo: ["Brush Script MT", "cursive"],
      },
      borderRadius: {
        media: "4px",
        panel: "20px",
        control: "999px",
      },
      transitionTimingFunction: {
        "ui-out": "cubic-bezier(0.23, 1, 0.32, 1)",
        "ui-in-out": "cubic-bezier(0.77, 0, 0.175, 1)",
      },
      transitionDuration: {
        120: "120ms",
        160: "160ms",
        180: "180ms",
      },
    },
  },
  plugins: [],
};

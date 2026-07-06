import type { Config } from "tailwindcss";

/**
 * suitz design tokens.
 *
 * The product is deliberately monochrome: a single light surface ("paper")
 * with intentional dark blocks ("ink"). No theme toggle — the brand IS the
 * black/white contrast. The only non-mono colour is a muted functional red,
 * used sparingly for error states (never decoration).
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0A0A0A",
          900: "#0A0A0A",
          800: "#171717",
          700: "#262626",
          600: "#404040",
          500: "#6B6B6B",
          400: "#8A8A8A",
          300: "#B5B5B5",
          200: "#D9D9D9",
          100: "#EAEAEA",
        },
        paper: {
          DEFAULT: "#FFFFFF",
          raised: "#FAFAFA",
          sunken: "#F4F4F3",
        },
        line: {
          DEFAULT: "#E7E7E5",
          strong: "#D4D4D1",
        },
        signal: {
          error: "#B23A2E",
          errorbg: "#FBEFED",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.04em" }],
      },
      borderRadius: {
        xs: "2px",
        sm: "4px",
        md: "6px",
        lg: "10px",
      },
      maxWidth: {
        shell: "1240px",
      },
      boxShadow: {
        pop: "0 12px 40px -12px rgba(10,10,10,0.18), 0 2px 8px -4px rgba(10,10,10,0.12)",
        inset: "inset 0 0 0 1px rgba(10,10,10,0.06)",
      },
      keyframes: {
        "reveal-blur": {
          "0%": { filter: "blur(7px)", opacity: "0.35" },
          "100%": { filter: "blur(0px)", opacity: "1" },
        },
        "scan": {
          "0%": { transform: "translateX(-110%)" },
          "100%": { transform: "translateX(110%)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        wiggle: {
          "0%, 100%": { transform: "translateY(0) rotate(-3deg)" },
          "50%": { transform: "translateY(-7px) rotate(3deg)" },
        },
        "grid-pan": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "56px 56px" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.5" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
        sheen: {
          "0%": { transform: "translateX(-130%) skewX(-18deg)" },
          "32%": { transform: "translateX(230%) skewX(-18deg)" },
          "100%": { transform: "translateX(230%) skewX(-18deg)" },
        },
      },
      animation: {
        "reveal-blur": "reveal-blur 520ms cubic-bezier(0.2,0.7,0.2,1) forwards",
        scan: "scan 1.1s ease-in-out infinite",
        "fade-up": "fade-up 360ms cubic-bezier(0.2,0.7,0.2,1) both",
        marquee: "marquee 40s linear infinite",
        "marquee-slow": "marquee 70s linear infinite",
        blink: "blink 1.1s step-end infinite",
        float: "float 6s ease-in-out infinite",
        wiggle: "wiggle 7s ease-in-out infinite",
        "grid-pan": "grid-pan 8s linear infinite",
        "pulse-ring": "pulse-ring 1.8s ease-out infinite",
        sheen: "sheen 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

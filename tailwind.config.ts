import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        serif: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          "sans-serif",
        ],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        ink: {
          DEFAULT: "hsl(var(--ink))",
          soft: "hsl(var(--ink-soft))",
        },
        paper: {
          DEFAULT: "hsl(var(--paper))",
          deep: "hsl(var(--paper-deep))",
        },
        sepia: {
          DEFAULT: "hsl(var(--sepia))",
          soft: "hsl(var(--sepia-soft))",
        },
        gold: "hsl(var(--gold))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        elev: "var(--shadow-elev)",
      },
      backgroundImage: {
        "gradient-paper": "var(--gradient-paper)",
        "gradient-ink": "var(--gradient-ink)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "fade-in-slow": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "scale-in": { "0%": { opacity: "0", transform: "scale(0.96)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        "tick": { "0%, 100%": { transform: "scaleY(1)", opacity: "0.4" }, "50%": { transform: "scaleY(1.6)", opacity: "1" } },
        "pulse-soft": { "0%, 100%": { opacity: "0.6" }, "50%": { opacity: "1" } },
        "pendulum": { "0%": { transform: "rotate(-14deg)" }, "100%": { transform: "rotate(14deg)" } },
        "breathe": { "0%, 100%": { transform: "scale(1)", opacity: "0.5" }, "50%": { transform: "scale(1.04)", opacity: "0.8" } },
        "page-next": { "0%": { opacity: "0", transform: "translateX(12px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
        "page-prev": { "0%": { opacity: "0", transform: "translateX(-12px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s cubic-bezier(0.4,0,0.2,1) both",
        "fade-in-slow": "fade-in-slow 0.9s ease-out both",
        "scale-in": "scale-in 0.4s cubic-bezier(0.4,0,0.2,1) both",
        "tick": "tick 0.15s ease-out",
        "pulse-soft": "pulse-soft 3s ease-in-out infinite",
        "breathe": "breathe 4s ease-in-out infinite",
        "page-next": "page-next 200ms cubic-bezier(0.2,0.7,0.2,1) both",
        "page-prev": "page-prev 200ms cubic-bezier(0.2,0.7,0.2,1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

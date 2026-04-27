import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";

// Stack auditado: ESLint solo cubre lo que Biome no entiende — react-hooks y reglas de Next App Router.
// Format + lint general lo hace Biome.
export default [
  {
    ignores: [".next/**", "node_modules/**", "components/ui/**"],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...reactHooks.configs.recommended.rules,
    },
  },
];

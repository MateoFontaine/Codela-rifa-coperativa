// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Ignorar carpetas generadas
  { ignores: ["**/node_modules/**", ".next/**"] },

  // Config base de Next + TypeScript
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Reglas propias (acá apagamos el any)
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      // Si querés, podés bajar otras reglas molestas:
      // "@typescript-eslint/ban-ts-comment": "off",
      // "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    },
  },
];

export default eslintConfig;

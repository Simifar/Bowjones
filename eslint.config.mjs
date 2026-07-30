import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    // Keep only a few relaxed rules for now; tighten later.
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/exhaustive-deps": "off",
    "react-hooks/purity": "off",
    "no-console": "warn",
  },
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "mini-services/**"]
}];

export default eslintConfig;

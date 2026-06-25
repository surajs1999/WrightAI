import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // React 19 compiler rules — too strict for existing patterns
      "react-hooks/set-state-in-effect": "off",
      "react-compiler/react-compiler": "off",
      "react-hooks/immutability": "off",
      // Cosmetic/style rules — off to avoid noise across the codebase
      "react/no-unescaped-entities": "off",
      "react/jsx-no-comment-textnodes": "off",
      // Downgrade to warn — any is sometimes unavoidable with third-party SDKs
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;

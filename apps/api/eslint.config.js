import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "worker-configuration.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: {
        console: "readonly",
        crypto: "readonly",
        fetch: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        TextEncoder: "readonly",
        btoa: "readonly",
        atob: "readonly"
      }
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/consistent-type-imports": "error"
    }
  }
);

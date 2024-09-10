// @ts-check
import globals from "globals";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    files: ["src/**/*.{ts,mts}", "test/**/*.{ts,mts}"], // Specify the file patterns to lint within the src folder
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // Disable the rule globally
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
  {
    ignores: ["dist/", "coverage/", "kubernetes/"],
  },
];

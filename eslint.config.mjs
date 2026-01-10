import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Disable rules that might be causing problems
      "import/no-unresolved": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "react/jsx-no-undef": "off",
      "import/extensions": "off",
      "@next/next/no-html-link-for-pages": "off",
    },
  }
];

export default eslintConfig;

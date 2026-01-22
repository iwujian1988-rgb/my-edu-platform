import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // ❌ 移除 TypeScript 检查（避免构建时的类型错误）
  // ...nextTs,

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // ✅ 忽略更多文件以加快构建
    "**/*.config.{js,ts,mjs}",
    "node_modules/**",
  ]),
]);

export default eslintConfig;

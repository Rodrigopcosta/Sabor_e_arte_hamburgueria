import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"
import prettierConfig from "eslint-config-prettier/flat"

export default [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "no-use-before-define": "warn",
      "@typescript-eslint/no-use-before-define": [
        "warn",
        {
          "functions": false,
          "classes": true,
          "variables": false
        }
      ],
      "prefer-const": "warn"
    }
  },
  prettierConfig,
]

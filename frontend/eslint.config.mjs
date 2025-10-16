import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends(
    "next/core-web-vitals", 
    "next/typescript"
  ),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".open-next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "**/*.js", // Ignore generated JS files
      "**/*.d.ts", // Ignore declaration files
    ],
  },
  {
    rules: {

      // Prevent meaningless variable names (relaxed for existing code)
      "@typescript-eslint/naming-convention": [
        "warn",
        {
          "selector": "variable",
          "format": ["camelCase", "PascalCase", "UPPER_CASE"],
          "filter": {
            // Reject only the most obvious AI-generated names
            "regex": "^(data|item|value|temp|test|foo|bar|baz|stuff|thing|something|whatever)\\d*$",
            "match": false
          }
        },
        {
          "selector": "function",
          "format": ["camelCase", "PascalCase"],
          "filter": {
            "regex": "^(doSomething|handleStuff|processData|helper|util|temp)\\d*$",
            "match": false
          }
        },
        {
          "selector": "parameter",
          "format": ["camelCase"],
          "leadingUnderscore": "allow", // Allow _unused parameters
          "filter": {
            "regex": "^(data|item|value|temp|obj|arr|el|param)\\d*$",
            "match": false
          }
        }
      ],

      // Prevent overly complex code (reasonable limits)
      "complexity": ["warn", { "max": 25 }],
      "max-depth": ["warn", { "max": 5 }],
      "max-nested-callbacks": ["error", { "max": 4 }],

      // Prevent extremely long functions (generous but effective)
      "max-lines-per-function": [
        "warn", 
        { 
          "max": 300,
          "skipBlankLines": true, 
          "skipComments": true,
          "IIFEs": true 
        }
      ],

      // Prevent too many parameters
      "max-params": ["warn", { "max": 6 }],

      // Reduce console warnings to focus on important ones
      "no-console": ["warn", { "allow": ["warn", "error", "info"] }],

      // Only flag the most problematic TODO patterns
      "no-warning-comments": [
        "warn",
        {
          "terms": ["fixme", "hack", "xxx"],
          "location": "start"
        }
      ],


      // Force strict equality (prevents common AI mistakes)
      "eqeqeq": ["error", "always"],

      // Reduce any warnings to focus on intentional usage
      "@typescript-eslint/no-explicit-any": "warn",

      // Smart unused variable detection
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_",
          "destructuredArrayIgnorePattern": "^_"
        }
      ],

      // React-specific quality rules
      "react/jsx-key": [
        "error",
        {
          "checkFragmentShorthand": true,
          "checkKeyMustBeforeSpread": true,
          "warnOnDuplicates": true
        }
      ],

      // Prevent duplicate imports (common AI mistake)
      "no-duplicate-imports": "error",

      // Force proper async patterns
      "no-async-promise-executor": "error",
      "prefer-promise-reject-errors": "error",

      // Prevent useless code patterns
      "no-useless-return": "error",
      "no-useless-computed-key": "error",
      "no-useless-constructor": "error",

      // Force modern JavaScript patterns
      "prefer-const": "error",
      "prefer-template": "warn",
      "prefer-arrow-callback": "warn",

      // Prevent dangerous patterns in financial calculations
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",

      // ==========================================
      // RELAXED RULES FOR PRACTICAL DEVELOPMENT
      // ==========================================

      // Make return type enforcement optional (too noisy for existing code)
      "@typescript-eslint/explicit-function-return-type": "off",

      // Allow component prop destructuring (common React pattern)
      "react/destructuring-assignment": "off",

      // Allow reasonable function definitions
      "react/function-component-definition": "off",

      // Allow consistent returns in some cases
      "consistent-return": "warn"
    }
  },
  // Override for page components - allow longer functions
  {
    files: ["**/*.tsx"],
    rules: {
      "max-lines-per-function": ["warn", { "max": 500, "skipBlankLines": true, "skipComments": true }],
      "complexity": ["warn", { "max": 40 }]
    }
  }
];

export default eslintConfig;

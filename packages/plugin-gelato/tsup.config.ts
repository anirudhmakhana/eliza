import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"], // Ensure you're targeting ESM
    external: [
        "dotenv",
        "fs",
        "path",
        "@reflink/reflink",
        "@node-llama-cpp",
        "https",
        "http",
        "agentkeepalive",
        "events", // Externalize 'events' to prevent bundling issues
    ],
    banner: {
        js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
    },
});

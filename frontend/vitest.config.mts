import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * O "@/" do tsconfig, repetido para o Vitest.
 *
 * O Next resolve esse prefixo sozinho; o Vitest nao le o tsconfig, entao um
 * arquivo que use "@/shared/..." so quebra quando alguem tenta testa-lo — e a
 * saida ("Cannot find package '@/shared/config/api'") parece dependencia
 * faltando, nao alias.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});

import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { CHAVE_DO_CACHE, esquecerSessaoAnterior } from "./cache-da-sessao";

/** Um sessionStorage de mentira: o Vitest roda em node, onde ele não existe. */
const armazenamento = (inicial: Record<string, string> = {}) => {
  const dados = new Map(Object.entries(inicial));
  return {
    getItem: (chave: string) => dados.get(chave) ?? null,
    setItem: (chave: string, valor: string) => void dados.set(chave, valor),
    removeItem: (chave: string) => void dados.delete(chave),
  };
};

describe("esquecerSessaoAnterior", () => {
  it("tira da memória o que a conta anterior carregou", () => {
    const cliente = new QueryClient();
    cliente.setQueryData(["usuario-atual"], { email: "quem@saiu.com" });
    cliente.setQueryData(["painel-caixa", "lojas"], [{ id: "loja-da-outra-empresa" }]);

    esquecerSessaoAnterior(cliente, armazenamento());

    expect(cliente.getQueryData(["usuario-atual"])).toBeUndefined();
    expect(cliente.getQueryData(["painel-caixa", "lojas"])).toBeUndefined();
  });

  it("apaga a cópia salva na aba na hora, sem esperar o persister", () => {
    // O persister grava com atraso de 1s. Quem sai navega antes disso, e a
    // cópia antiga voltava inteira na tela de login: era ela que o próximo
    // login via como se fosse dele.
    const guardado = armazenamento({ [CHAVE_DO_CACHE]: '{"clientState":{"queries":[]}}' });

    esquecerSessaoAnterior(new QueryClient(), guardado);

    expect(guardado.getItem(CHAVE_DO_CACHE)).toBeNull();
  });

  it("não apaga o que não é o cache das consultas", () => {
    const guardado = armazenamento({
      [CHAVE_DO_CACHE]: "{}",
      "outra-coisa-da-aba": "fica",
    });

    esquecerSessaoAnterior(new QueryClient(), guardado);

    expect(guardado.getItem("outra-coisa-da-aba")).toBe("fica");
  });

  it("com o armazenamento bloqueado, ainda esvazia a memória", () => {
    // Aba anônima e navegador com dados bloqueados lançam exceção no
    // sessionStorage. O login não pode morrer por isso — e a memória, que é
    // o que a tela mostra, tem que sair limpa do mesmo jeito.
    const cliente = new QueryClient();
    cliente.setQueryData(["usuario-atual"], { email: "quem@saiu.com" });
    const bloqueado = {
      removeItem: () => {
        throw new Error("SecurityError");
      },
    };

    expect(() => esquecerSessaoAnterior(cliente, bloqueado)).not.toThrow();
    expect(cliente.getQueryData(["usuario-atual"])).toBeUndefined();
  });
});

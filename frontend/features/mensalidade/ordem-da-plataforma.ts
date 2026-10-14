import type { EmpresaDaPlataforma } from "./services/mensalidade";

/**
 * A ordem da lista da Plataforma.
 *
 * A lista se reordenava sozinha por situacao, a cada mudanca: o dono
 * desmarcava "Isenta" da ZNT e ela pulava de lugar debaixo do ponteiro. Agora
 * a ordem e uma lista de ids, tirada uma vez — ao abrir, por nome, ou quando
 * ele escolhe outro criterio no topo — e travada ate ele pedir de novo.
 */
export type CriterioDeOrdem = "NOME" | "SITUACAO" | "PAGA_ATE";

export const CRITERIOS: { valor: CriterioDeOrdem; rotulo: string }[] = [
  { valor: "NOME", rotulo: "Nome" },
  { valor: "SITUACAO", rotulo: "Situação" },
  { valor: "PAGA_ATE", rotulo: "Paga até" },
];

// Quem precisa de atencao primeiro — a mesma ordem que a API usava.
const PESO_DA_SITUACAO: Partial<Record<EmpresaDaPlataforma["situacao"], number>> = {
  AGUARDANDO: 0,
  BLOQUEADA: 1,
  ATRASADA: 2,
  VENCENDO: 3,
};

const porNome = (a: EmpresaDaPlataforma, b: EmpresaDaPlataforma) =>
  a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });

/** Os ids das empresas no criterio pedido; o nome desempata. */
export const ordenarEmpresas = (
  empresas: EmpresaDaPlataforma[],
  criterio: CriterioDeOrdem,
): string[] => {
  const comparar = (a: EmpresaDaPlataforma, b: EmpresaDaPlataforma) => {
    if (criterio === "SITUACAO") {
      const diferenca =
        (PESO_DA_SITUACAO[a.situacao] ?? 4) - (PESO_DA_SITUACAO[b.situacao] ?? 4);
      if (diferenca !== 0) return diferenca;
    }
    if (criterio === "PAGA_ATE" && a.paga_ate !== b.paga_ate) {
      // Sem data (isenta antiga, dado torto) vai para o fim: nao vence nunca.
      if (!a.paga_ate) return 1;
      if (!b.paga_ate) return -1;
      return a.paga_ate < b.paga_ate ? -1 : 1;
    }
    return porNome(a, b);
  };
  return [...empresas].sort(comparar).map((empresa) => empresa.id);
};

/** As empresas na ordem travada. Empresa que nao estava nela (cadastrada
 *  depois) entra no fim, por nome, sem embaralhar as outras. */
export const naOrdem = (
  empresas: EmpresaDaPlataforma[],
  ordem: string[],
): EmpresaDaPlataforma[] => {
  const posicao = new Map(ordem.map((id, indice) => [id, indice]));
  const conhecidas = empresas
    .filter((empresa) => posicao.has(empresa.id))
    .sort((a, b) => posicao.get(a.id)! - posicao.get(b.id)!);
  const novas = empresas.filter((empresa) => !posicao.has(empresa.id)).sort(porNome);
  return [...conhecidas, ...novas];
};

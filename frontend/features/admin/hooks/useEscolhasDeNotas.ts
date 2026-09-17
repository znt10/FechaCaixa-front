"use client";

import { useEffect, useState } from "react";

import { ESCOLHAS_INICIAIS, type EscolhasDaTela } from "../notas-da-tela";

/**
 * Os filtros da tela de notas, com "so as que faltam classificar" lembrado.
 *
 * Era `useState(ESCOLHAS_INICIAIS)`: sair da tela desmonta o componente e o
 * estado morre junto, entao quem desmarcava a caixa para procurar uma nota ja
 * classificada voltava de outra pagina com ela marcada de novo — e a nota
 * sumia da lista sem explicacao. Classificar o mes e ir e voltar entre esta
 * tela e as outras, e cada volta desfazia a escolha.
 *
 * So a caixa e lembrada. Loja, periodo e pagina continuam nascendo limpos: um
 * filtro de data guardado esconderia notas novas na proxima visita, e a pessoa
 * leria "nao chegou nota nenhuma" quando o que houve foi um filtro de duas
 * semanas atras ainda de pe. A caixa nao tem esse risco — ela e o modo de
 * trabalho da tela, nao um recorte do periodo.
 *
 * localStorage pelo mesmo motivo do `useRecolhido`: isto e conveniencia de
 * quem esta olhando, nao dado do sistema. Fica no navegador de cada um, e um
 * navegador que recusa gravar apenas volta ao padrao.
 */
const CHAVE = "fechacaixa:notas-so-pendentes";

const lerSoPendentes = () => {
  try {
    const cru = window.localStorage.getItem(CHAVE);
    // Sem nada gravado vale o padrao: abre na fila de trabalho.
    return cru === null ? ESCOLHAS_INICIAIS.soPendentes : cru === "true";
  } catch {
    return ESCOLHAS_INICIAIS.soPendentes;
  }
};

export const useEscolhasDeNotas = () => {
  // O inicializador le direto porque esta arvore so renderiza no cliente (ver
  // o HydrationGuard em app/providers.tsx). Ler dentro de um efeito faria a
  // tela buscar a lista errada primeiro e trocar no quadro seguinte — um
  // piscar, e uma chamada a toa a cada visita.
  const [escolhas, setEscolhas] = useState<EscolhasDaTela>(() =>
    typeof window === "undefined"
      ? ESCOLHAS_INICIAIS
      : { ...ESCOLHAS_INICIAIS, soPendentes: lerSoPendentes() },
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAVE, String(escolhas.soPendentes));
    } catch {
      // Storage cheio ou desligado: a tela funciona igual, so nao lembra.
    }
  }, [escolhas.soPendentes]);

  return [escolhas, setEscolhas] as const;
};

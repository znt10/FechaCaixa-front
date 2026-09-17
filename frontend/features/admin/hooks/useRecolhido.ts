"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * O estado recolhido de uma secao, lembrado entre visitas.
 *
 * Era `useState(false)`: quem recolhia "Lojas" para enxergar o resto da tela
 * encontrava tudo aberto de novo ao voltar de outra pagina, porque sair da
 * tela desmonta o componente e o estado morre junto. Recolher e uma escolha
 * sobre como a pessoa quer ver a tela, e nao um passo do que ela esta fazendo
 * agora — tem que sobreviver a navegacao.
 *
 * localStorage, e nao um estado global: isto e conveniencia de quem esta
 * olhando, nao dado do sistema. Fica no navegador de cada um, e um navegador
 * que recusa gravar (aba anonima, storage desligado) apenas volta ao padrao.
 */
const CHAVE = "fechacaixa:secoes-recolhidas";

const lerTudo = (): Record<string, boolean> => {
  try {
    const cru = window.localStorage.getItem(CHAVE);
    return cru ? (JSON.parse(cru) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
};

export const useRecolhido = (secao: string) => {
  // O inicializador le direto porque esta arvore so renderiza no cliente (ver
  // o HydrationGuard em app/providers.tsx). Ler dentro de um efeito abriria a
  // secao por um quadro antes de recolher, e a tela piscaria a cada visita.
  const [recolhido, setRecolhido] = useState(() =>
    typeof window === "undefined" ? false : lerTudo()[secao] === true,
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(
        CHAVE,
        JSON.stringify({ ...lerTudo(), [secao]: recolhido }),
      );
    } catch {
      // Storage cheio ou desligado: a secao continua funcionando, so nao
      // lembra da proxima vez. Nao ha o que dizer a quem esta usando a tela.
    }
  }, [secao, recolhido]);

  const alternar = useCallback(() => setRecolhido((antes) => !antes), []);

  return [recolhido, alternar] as const;
};

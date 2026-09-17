"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  precisaAtualizar,
  VERSAO_DE_DESENVOLVIMENTO,
  VERSAO_DO_APP,
} from "@/shared/config/versao";

/**
 * A faixa "saiu versao nova" do app instalado.
 *
 * NAO recarrega sozinho, e isso e a regra principal deste arquivo: quem esta
 * com o app aberto esta digitando o caixa, e um reload no meio disso apaga o
 * que ela ja preencheu. A pessoa toca em "Atualizar" quando puder.
 *
 * Fica no Providers (e nao so nas telas do formulario) porque o problema nao e
 * do PWA: qualquer aba aberta durante um deploy fica com o bundle antigo, e o
 * painel da gerencia passa o dia aberto no computador da loja.
 */

// De quanto em quanto tempo perguntar. Quinze minutos porque ninguem precisa
// saber do deploy no segundo em que ele acontece — e sao ~50 bytes por
// pergunta, num aparelho que fica dias ligado.
const INTERVALO_DE_CHECAGEM = 15 * 60 * 1000;

// Piso entre duas perguntas. Sem ele, trocar de app e voltar dez vezes seguidas
// (o que acontece: a pessoa confere o valor na maquininha e volta) dispararia
// dez chamadas.
const ESPERA_MINIMA_ENTRE_CHECAGENS = 60 * 1000;

// Quanto tempo o "Depois" segura a faixa. Tempo de terminar o lancamento e
// fechar o turno sem ela na frente.
const DURACAO_DO_ADIAMENTO = 30 * 60 * 1000;

/** A versao que o servidor esta servindo agora, ou undefined se nao deu. */
const versaoNoAr = async (sinal: AbortSignal): Promise<string | undefined> => {
  try {
    const resposta = await fetch("/api/versao", {
      cache: "no-store",
      signal: sinal,
    });
    if (!resposta.ok) return undefined;

    const corpo: unknown = await resposta.json();
    const versao = (corpo as { versao?: unknown })?.versao;
    return typeof versao === "string" ? versao : undefined;
  } catch {
    // Rede caida, ou o proprio servidor reiniciando no meio do deploy. Silencio
    // e a resposta certa: quem esta lancando o caixa as 22h nao tem o que fazer
    // com um erro de checagem de versao.
    return undefined;
  }
};

export function AvisoDeNovaVersao() {
  const [temNovaVersao, setTemNovaVersao] = useState(false);
  const [adiado, setAdiado] = useState(false);
  const ultimaChecagem = useRef(0);
  const timerDoAdiamento = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Em desenvolvimento nao existe deploy: o dev server recarrega sozinho.
    if (VERSAO_DO_APP === VERSAO_DE_DESENVOLVIMENTO) return;

    const controle = new AbortController();
    let montado = true;

    const checar = async () => {
      const agora = Date.now();
      if (agora - ultimaChecagem.current < ESPERA_MINIMA_ENTRE_CHECAGENS) return;
      ultimaChecagem.current = agora;

      const doServidor = await versaoNoAr(controle.signal);
      if (!montado) return;
      if (precisaAtualizar(VERSAO_DO_APP, doServidor)) setTemNovaVersao(true);
    };

    // Voltar para o app e o melhor momento para avisar: a pessoa acabou de
    // olhar para a tela, e provavelmente nao esta no meio de um campo.
    const aoVoltarParaOApp = () => {
      if (document.visibilityState === "visible") void checar();
    };

    const intervalo = setInterval(() => void checar(), INTERVALO_DE_CHECAGEM);
    document.addEventListener("visibilitychange", aoVoltarParaOApp);

    return () => {
      montado = false;
      controle.abort();
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoVoltarParaOApp);
    };
  }, []);

  useEffect(
    () => () => {
      if (timerDoAdiamento.current) clearTimeout(timerDoAdiamento.current);
    },
    [],
  );

  const adiar = useCallback(() => {
    setAdiado(true);
    if (timerDoAdiamento.current) clearTimeout(timerDoAdiamento.current);
    timerDoAdiamento.current = setTimeout(
      () => setAdiado(false),
      DURACAO_DO_ADIAMENTO,
    );
  }, []);

  if (!temNovaVersao || adiado) return null;

  return (
    <div
      role="status"
      // Embaixo, e nao em cima: no celular o topo e onde ficam o titulo da tela
      // e o valor que a pessoa acabou de digitar.
      className="fixed inset-x-0 bottom-0 z-50 border-t border-caixa-detalhe bg-caixa-surface px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
    >
      <div className="mx-auto flex max-w-[520px] flex-col gap-3">
        <div>
          <p className="text-[15px] font-semibold text-caixa-ink">
            Nova versão disponível
          </p>
          <p className="mt-1 text-[13px] text-caixa-muted">
            Atualize quando terminar o que está fazendo. Nada do que já foi
            enviado se perde.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-[44px] flex-1 rounded-[10px] bg-caixa-accent text-[15px] font-semibold text-white transition hover:brightness-110"
          >
            Atualizar
          </button>
          <button
            type="button"
            onClick={adiar}
            className="h-[44px] rounded-[10px] border border-caixa-border px-4 text-[15px] font-medium text-caixa-muted transition hover:bg-caixa-faixa"
          >
            Depois
          </button>
        </div>
      </div>
    </div>
  );
}

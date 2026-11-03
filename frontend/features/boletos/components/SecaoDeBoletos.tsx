"use client";

import { useState } from "react";

import { Pergunta, TituloSecao } from "@/features/fechamento/components/campos";

import type { BoletosDoTurno } from "../boletos-do-formulario";
import { resumoDoBoletoSalvo } from "../prazo-do-boleto";
import { enviarBoletoDaLoja } from "../services/boletos";
import { CartaoDoBoleto } from "./CartaoDoBoleto";

/**
 * Os boletos que chegaram na loja, no fechamento do caixa.
 *
 * Seção própria e envio próprio, fora do envio do turno: o boleto fica
 * guardado na hora, mesmo que o turno não seja enviado, e não entra em conta
 * nenhuma do caixa. O estado mora no formulário (`boletos`): a revisão do
 * envio tira esta seção da tela, e voltar dela não pode sumir com o que já foi
 * salvo nem deixar mandar o mesmo boleto de novo.
 */
export function SecaoDeBoletos({
  loja,
  boletos,
  aoMudar,
}: {
  loja: string;
  boletos: BoletosDoTurno;
  aoMudar: (mudar: (atual: BoletosDoTurno) => BoletosDoTurno) => void;
}) {
  // A chave remonta o cartão vazio para o próximo boleto.
  const [chave, setChave] = useState(0);
  const [cartaoAberto, setCartaoAberto] = useState(boletos.salvos.length === 0);

  return (
    <>
      <TituloSecao>BOLETOS E CONTAS</TituloSecao>
      <Pergunta
        rotulo="Chegou boleto ou conta para pagar depois?"
        valor={boletos.houve}
        onChange={(houve) => aoMudar((atual) => ({ ...atual, houve }))}
      >
        {boletos.salvos.map((boleto) => (
          <p key={boleto.id} className="text-[14px] font-medium leading-[1.4] text-caixa-accent">
            ✓ {resumoDoBoletoSalvo(boleto)}
          </p>
        ))}

        {cartaoAberto ? (
          <CartaoDoBoleto
            key={chave}
            id={`boleto-${chave}`}
            loja={loja || undefined}
            semLoja={!loja}
            enviar={enviarBoletoDaLoja}
            aoMudarPendente={(pendente) => aoMudar((atual) => ({ ...atual, pendente }))}
            aoSalvar={(boleto) => {
              aoMudar((atual) => ({ ...atual, salvos: [...atual.salvos, boleto], pendente: false }));
              setCartaoAberto(false);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setChave((atual) => atual + 1);
              setCartaoAberto(true);
            }}
            className="w-full rounded-[10px] border border-dashed border-caixa-accent px-[16px] py-[12px] text-[14px] font-semibold text-caixa-accent transition active:scale-[0.99]"
          >
            + Outro boleto
          </button>
        )}
      </Pergunta>
    </>
  );
}

"use client";

import { useState } from "react";

import { Pergunta, TituloSecao } from "@/features/fechamento/components/campos";

import { resumoDoBoletoSalvo } from "../prazo-do-boleto";
import { enviarBoletoDaLoja, type Boleto } from "../services/boletos";
import { CartaoDoBoleto } from "./CartaoDoBoleto";

/**
 * Os boletos que chegaram na loja, no fechamento do caixa.
 *
 * Seção própria e envio próprio, fora do envio do turno: o boleto fica
 * guardado na hora, mesmo que o turno não seja enviado, e não entra em conta
 * nenhuma do caixa. Desligar a pergunta só esconde o cartão — o que já foi
 * salvo está no servidor.
 */
export function SecaoDeBoletos({ loja }: { loja: string }) {
  const [houve, setHouve] = useState(false);
  const [salvos, setSalvos] = useState<Boleto[]>([]);
  // A chave remonta o cartão vazio para o próximo boleto.
  const [chave, setChave] = useState(0);
  const [cartaoAberto, setCartaoAberto] = useState(true);

  return (
    <>
      <TituloSecao>BOLETOS E CONTAS</TituloSecao>
      <Pergunta
        rotulo="Chegou boleto ou conta para pagar depois?"
        valor={houve}
        onChange={setHouve}
      >
        {salvos.map((boleto) => (
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
            aoSalvar={(boleto) => {
              setSalvos((anteriores) => [...anteriores, boleto]);
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

"use client";

import { useState } from "react";

import { jeitoDePagar, reais } from "../mensalidade-da-tela";
import { useGerarLink, useInformarPagamento } from "../hooks/useMensalidade";
import type { MinhaMensalidade } from "../services/mensalidade";

const BOTAO =
  "rounded-[10px] bg-caixa-accent px-[18px] py-[10px] text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60";

/**
 * O pagamento da mensalidade: o link da InfinitePay ou, sem ela, o QR, o
 * copia e cola e o "Já paguei".
 *
 * O "Já paguei" pede confirmação: apertar sem ter pago segura o bloqueio por
 * três dias e manda o dono conferir um banco onde não caiu nada.
 */
export function QuadroDoPix({ mensalidade }: { mensalidade: MinhaMensalidade }) {
  const jeito = jeitoDePagar(mensalidade);
  return (
    <div className="flex flex-col items-center gap-[14px] rounded-[12px] border border-caixa-border bg-caixa-surface px-[20px] py-[20px] text-center text-caixa-ink">
      {jeito.tipo === "link" ? (
        <PeloLink mensalidade={mensalidade} link={jeito.link} frase={jeito.frase} />
      ) : (
        <PeloPix mensalidade={mensalidade} />
      )}
    </div>
  );
}

/**
 * O botão que abre o checkout numa aba nova. A aba abre no clique, antes do
 * pedido: aberta depois do `await`, o bloqueador de pop-up do celular barra.
 * A tela que ficou para trás se relê sozinha e libera quando o pagamento cai.
 */
function PeloLink({
  mensalidade,
  link,
  frase,
}: {
  mensalidade: MinhaMensalidade;
  link: string | null;
  frase: string;
}) {
  const gerar = useGerarLink();

  const pagar = () => {
    const aba = window.open("about:blank", "_blank");
    gerar.mutate(undefined, {
      onSuccess: (resposta) => {
        if (!resposta.link) {
          aba?.close();
          return;
        }
        if (aba) aba.location.href = resposta.link;
        else window.location.href = resposta.link;
      },
      onError: () => aba?.close(),
    });
  };

  return (
    <>
      <p className="text-[16px] font-semibold tabular-nums">{reais(mensalidade.valor)}</p>
      <p className="text-[14px] text-caixa-muted">{frase}</p>
      {!mensalidade.pode_pagar ? (
        <p className="text-[13px] text-caixa-muted">Peça ao gerente da empresa para pagar.</p>
      ) : link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className={BOTAO}>
          Pagar mensalidade
        </a>
      ) : (
        <button type="button" onClick={pagar} disabled={gerar.isPending} className={BOTAO}>
          {gerar.isPending ? "Abrindo..." : "Pagar mensalidade"}
        </button>
      )}
      {gerar.error && (
        <p className="text-[14px] font-medium text-caixa-alerta">
          {gerar.error instanceof Error
            ? gerar.error.message
            : "Não foi possível abrir o pagamento."}
        </p>
      )}
    </>
  );
}

function PeloPix({ mensalidade }: { mensalidade: MinhaMensalidade }) {
  const informar = useInformarPagamento();
  const [copiado, setCopiado] = useState(false);
  const valor = reais(mensalidade.valor);
  const jeito = jeitoDePagar(mensalidade);

  const copiar = async () => {
    if (jeito.tipo !== "pix") return;
    try {
      await navigator.clipboard.writeText(jeito.copiaECola);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  const jaPaguei = () => {
    if (window.confirm(`Confirma que pagou ${valor}?`)) informar.mutate();
  };

  return (
    <>
      {jeito.tipo === "pix" ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={jeito.qrSvg} alt={`QR Code Pix de ${valor}`} className="h-[220px] w-[220px]" />
          <p className="text-[16px] font-semibold tabular-nums">{valor}</p>
          <div className="flex w-full max-w-[440px] gap-[8px]">
            <input
              readOnly
              value={jeito.copiaECola}
              aria-label="Pix copia e cola"
              onFocus={(evento) => evento.target.select()}
              className="min-w-0 flex-1 rounded-[10px] border border-caixa-border bg-caixa-faixa px-[12px] py-[9px] text-[12px]"
            />
            <button
              type="button"
              onClick={copiar}
              className="rounded-[10px] border border-caixa-border px-[14px] py-[9px] text-[13px] font-semibold transition hover:border-caixa-accent/40"
            >
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
        </>
      ) : (
        jeito.tipo === "indisponivel" && (
          <p className="text-[14px] text-caixa-muted">{jeito.texto}</p>
        )
      )}

      {mensalidade.pode_informar ? (
        <button type="button" onClick={jaPaguei} disabled={informar.isPending} className={BOTAO}>
          {informar.isPending ? "Avisando..." : "Já paguei"}
        </button>
      ) : (
        mensalidade.situacao !== "AGUARDANDO" && (
          <p className="text-[13px] text-caixa-muted">
            Peça ao gerente da empresa para pagar ou informar o pagamento.
          </p>
        )
      )}

      {informar.error && (
        <p className="text-[14px] font-medium text-caixa-alerta">
          {informar.error instanceof Error
            ? informar.error.message
            : "Não foi possível avisar o pagamento."}
        </p>
      )}
    </>
  );
}

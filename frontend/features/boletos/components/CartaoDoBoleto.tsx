"use client";

import { useState } from "react";

import {
  Campo,
  CampoMoeda,
  CampoTexto,
  digitosParaDecimal,
} from "@/features/fechamento/components/campos";

import type { Boleto, NovoBoleto } from "../services/boletos";

/**
 * Foto + vencimento + valor + Salvar: o boleto que chegou.
 *
 * A data digitada é o caminho principal, e a foto lida é bônus: o celular da
 * loja pode tirar uma foto que ninguém lê. Sem a data, o primeiro toque em
 * Salvar só pede a data; o segundo salva "sem data", e o boleto chega para o
 * dono com a foto, marcado para ele abrir.
 */
export function CartaoDoBoletoVista({
  id,
  arquivoNome,
  vencimento,
  valorDigitos,
  pedindoData,
  enviando,
  erro,
  semLoja,
  aoEscolherArquivo,
  aoMudarVencimento,
  aoMudarValor,
  aoSalvar,
}: {
  /** Prefixo dos ids dos campos: pode haver mais de um cartão na tela. */
  id: string;
  arquivoNome: string | null;
  vencimento: string;
  valorDigitos: string;
  pedindoData: boolean;
  enviando: boolean;
  erro: string | null;
  semLoja: boolean;
  aoEscolherArquivo: (arquivo: File | null) => void;
  aoMudarVencimento: (vencimento: string) => void;
  aoMudarValor: (digitos: string) => void;
  aoSalvar: () => void;
}) {
  return (
    <div className="flex w-full flex-col gap-[12px] rounded-[10px] border border-caixa-border bg-caixa-surface p-[14px]">
      <Campo rotulo="FOTO OU PDF DO BOLETO" htmlFor={`${id}-arquivo`}>
        {/* O input fica escondido atrás de um rótulo que parece botão: o
            campo de arquivo nativo mostra "Nenhum arquivo escolhido" em
            letra miúda, e no celular é o toque aqui que abre a câmera. */}
        <label
          htmlFor={`${id}-arquivo`}
          className="w-full cursor-pointer truncate rounded-[10px] border border-dashed border-caixa-accent px-[16px] py-[12px] text-center text-[14px] font-semibold text-caixa-accent"
        >
          {arquivoNome ?? "Tirar foto ou escolher arquivo"}
        </label>
        <input
          id={`${id}-arquivo`}
          type="file"
          accept="image/*,application/pdf"
          className="sr-only"
          onChange={(evento) => aoEscolherArquivo(evento.target.files?.[0] ?? null)}
        />
      </Campo>

      <Campo rotulo="VENCIMENTO" htmlFor={`${id}-vencimento`}>
        <CampoTexto
          id={`${id}-vencimento`}
          type="date"
          valor={vencimento}
          onChange={aoMudarVencimento}
        />
      </Campo>
      {pedindoData && (
        <p className="text-[13px] leading-[1.45] text-caixa-warn">
          Sem a data, o boleto chega para o dono como “sem data”. Se a data estiver no papel,
          digite acima.
        </p>
      )}

      <Campo rotulo="VALOR (SE QUISER)" htmlFor={`${id}-valor`}>
        <CampoMoeda id={`${id}-valor`} digitos={valorDigitos} onChange={aoMudarValor} />
      </Campo>

      {erro && (
        <p role="alert" className="text-[13px] leading-[1.45] text-caixa-alerta">
          {erro}
        </p>
      )}
      {semLoja && (
        <p className="text-[13px] leading-[1.45] text-caixa-muted">
          Escolha a loja lá em cima para salvar o boleto.
        </p>
      )}

      <button
        type="button"
        disabled={enviando || semLoja}
        onClick={aoSalvar}
        className="w-full rounded-[10px] bg-caixa-accent px-[16px] py-[12px] text-[15px] font-semibold text-white transition active:scale-[0.99] disabled:opacity-50"
      >
        {enviando ? "Salvando…" : pedindoData ? "Salvar sem data" : "Salvar boleto"}
      </button>
    </div>
  );
}

/** O cartão com estado: guarda o que a pessoa escolheu e chama `enviar`. */
export function CartaoDoBoleto({
  id,
  loja,
  semLoja = false,
  enviar,
  aoSalvar,
}: {
  id: string;
  loja?: string;
  semLoja?: boolean;
  enviar: (novo: NovoBoleto) => Promise<Boleto>;
  aoSalvar: (boleto: Boleto) => void;
}) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [vencimento, setVencimento] = useState("");
  const [valorDigitos, setValorDigitos] = useState("");
  const [pedindoData, setPedindoData] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async () => {
    if (enviando || semLoja) return;
    if (!arquivo) {
      setErro("Tire a foto ou anexe o PDF do boleto.");
      return;
    }
    if (!vencimento && !pedindoData) {
      setPedindoData(true);
      return;
    }

    setEnviando(true);
    setErro(null);
    try {
      const boleto = await enviar({
        arquivo,
        loja,
        vencimento: vencimento || undefined,
        valor: valorDigitos ? digitosParaDecimal(valorDigitos) : undefined,
      });
      aoSalvar(boleto);
    } catch (falha) {
      // Os campos ficam como estavam: tentar de novo não pede tudo outra vez.
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar o boleto.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <CartaoDoBoletoVista
      id={id}
      arquivoNome={arquivo?.name ?? null}
      vencimento={vencimento}
      valorDigitos={valorDigitos}
      pedindoData={pedindoData && !vencimento}
      enviando={enviando}
      erro={erro}
      semLoja={semLoja}
      aoEscolherArquivo={(escolhido) => {
        setArquivo(escolhido);
        setErro(null);
      }}
      aoMudarVencimento={setVencimento}
      aoMudarValor={setValorDigitos}
      aoSalvar={salvar}
    />
  );
}

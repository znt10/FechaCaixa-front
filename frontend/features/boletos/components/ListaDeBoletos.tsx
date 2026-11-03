"use client";

import { useEffect, useState } from "react";

import {
  Campo,
  CampoMoeda,
  CampoSelecao,
  CampoTexto,
  decimalParaDigitos,
} from "@/features/fechamento/components/campos";
import { useLojasDoPainel } from "@/features/fechamento/hooks/usePainel";
import { emReais } from "@/features/fechamento/painel-dados";

import { valorDoCampo } from "../boletos-do-formulario";
import {
  useBoletos,
  useDescartarBoleto,
  useDesfazerPagamento,
  useEditarBoleto,
  useEnviarBoletoDoPainel,
  usePagarBoleto,
} from "../hooks/useBoletos";
import { hojeLocal, prazoDoBoleto, type TomDoPrazo } from "../prazo-do-boleto";
import { urlDoArquivo, type Boleto } from "../services/boletos";
import { CartaoDoBoleto } from "./CartaoDoBoleto";

type Aba = "A_PAGAR" | "PAGO";

const CLASSE_DO_TOM: Record<TomDoPrazo, string> = {
  alerta: "bg-caixa-alerta-soft text-caixa-alerta",
  aviso: "bg-caixa-warn-soft text-caixa-warn",
  neutro: "bg-caixa-bg text-caixa-muted",
};

const CLASSE_ACAO =
  "rounded-[8px] border border-caixa-border bg-caixa-surface px-[12px] py-[7px] text-[13px] font-medium text-caixa-ink transition hover:border-caixa-accent";

/** A linha digitável como vem impressa no papel: é o formato que o app do
 *  banco mostra na hora de conferir. */
export const linhaFormatada = (digitos: string) => {
  const d = digitos;
  if (d.length === 47) {
    return `${d.slice(0, 5)}.${d.slice(5, 10)} ${d.slice(10, 15)}.${d.slice(15, 21)} ${d.slice(21, 26)}.${d.slice(26, 32)} ${d[32]} ${d.slice(33)}`;
  }
  if (d.length === 48) {
    return [0, 1, 2, 3].map((i) => `${d.slice(12 * i, 12 * i + 11)}-${d[12 * i + 11]}`).join(" ");
  }
  return d;
};

const dataPorExtenso = (data: string) => {
  const [ano, mes, dia] = data.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
};

export function LinhaDoBoletoVista({
  boleto,
  hoje,
  aba,
  copiado,
  confirmandoDescarte,
  aoPagar,
  aoDesfazer,
  aoEditar,
  aoCopiar,
  aoPedirDescarte,
  aoConfirmarDescarte,
  aoCancelarDescarte,
}: {
  boleto: Boleto;
  hoje: string;
  aba: Aba;
  copiado: boolean;
  confirmandoDescarte: boolean;
  aoPagar: () => void;
  aoDesfazer: () => void;
  aoEditar: () => void;
  aoCopiar: () => void;
  aoPedirDescarte: () => void;
  aoConfirmarDescarte: () => void;
  aoCancelarDescarte: () => void;
}) {
  const prazo = prazoDoBoleto(boleto.vencimento, hoje);
  const quemCobra = boleto.beneficiario_nome || boleto.descricao || "Quem cobra: não lido";

  return (
    <li className="flex flex-col gap-[12px] rounded-[12px] border border-caixa-border bg-caixa-surface p-[16px]">
      <div className="flex flex-wrap items-center gap-[8px]">
        {aba === "A_PAGAR" && (
          <span className={`rounded-[999px] px-[10px] py-[3px] text-[12px] font-semibold ${CLASSE_DO_TOM[prazo.tom]}`}>
            {prazo.rotulo}
          </span>
        )}
        {boleto.conferir && (
          <span className="rounded-[999px] bg-caixa-warn-soft px-[10px] py-[3px] text-[12px] font-semibold text-caixa-warn">
            Conferir
          </span>
        )}
        <span className="text-[13px] text-caixa-muted">{boleto.loja_nome ?? "Sem loja"}</span>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-[8px]">
        <span className="text-[16px] font-semibold text-caixa-ink">{quemCobra}</span>
        <span className="text-[16px] font-semibold text-caixa-ink">
          {boleto.valor ? `R$ ${emReais(Number(boleto.valor))}` : "Valor não informado"}
        </span>
      </div>

      <p className="text-[14px] text-caixa-muted">
        {boleto.vencimento ? `Vencimento ${dataPorExtenso(boleto.vencimento)}` : "Sem data de vencimento"}
        {aba === "PAGO" && boleto.pago_em &&
          ` · pago em ${dataPorExtenso(boleto.pago_em)}${boleto.pago_por_nome ? ` por ${boleto.pago_por_nome}` : ""}`}
      </p>

      {boleto.linha_digitavel && (
        <div className="flex flex-wrap items-center gap-[8px] rounded-[10px] bg-caixa-bg px-[12px] py-[10px]">
          <code className="min-w-0 flex-1 break-all text-[13px] text-caixa-ink">
            {linhaFormatada(boleto.linha_digitavel)}
          </code>
          <button type="button" onClick={aoCopiar} className={CLASSE_ACAO}>
            {copiado ? "Copiado" : "Copiar"}
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-[8px]">
        {boleto.tem_arquivo && (
          <a
            href={urlDoArquivo(boleto.id)}
            target="_blank"
            rel="noreferrer"
            className="text-[13px] font-medium text-caixa-accent underline underline-offset-2"
          >
            {boleto.arquivo_tipo === "application/pdf" ? "Ver PDF" : "Ver foto"}
          </a>
        )}
        <span className="flex-1" />
        {confirmandoDescarte ? (
          <>
            <span className="text-[13px] text-caixa-ink">Descartar este boleto?</span>
            <button type="button" onClick={aoConfirmarDescarte} className={CLASSE_ACAO}>
              Sim
            </button>
            <button type="button" onClick={aoCancelarDescarte} className={CLASSE_ACAO}>
              Não
            </button>
          </>
        ) : aba === "A_PAGAR" ? (
          <>
            <button type="button" onClick={aoPedirDescarte} className={CLASSE_ACAO}>
              Descartar
            </button>
            <button type="button" onClick={aoEditar} className={CLASSE_ACAO}>
              Editar
            </button>
            <button
              type="button"
              onClick={aoPagar}
              className="rounded-[8px] bg-caixa-accent px-[14px] py-[7px] text-[13px] font-semibold text-white"
            >
              Paguei
            </button>
          </>
        ) : (
          <button type="button" onClick={aoDesfazer} className={CLASSE_ACAO}>
            Desfazer
          </button>
        )}
      </div>
    </li>
  );
}

function EdicaoDoBoleto({ boleto, aoFechar }: { boleto: Boleto; aoFechar: () => void }) {
  const editar = useEditarBoleto();
  const lojas = useLojasDoPainel();
  const [vencimento, setVencimento] = useState(boleto.vencimento ?? "");
  const [valorDigitos, setValorDigitos] = useState(decimalParaDigitos(boleto.valor));
  const [quemCobra, setQuemCobra] = useState(boleto.beneficiario_nome);
  const [descricao, setDescricao] = useState(boleto.descricao);
  const [loja, setLoja] = useState(boleto.loja ?? "");
  const id = `editar-${boleto.id}`;

  const salvar = () =>
    editar.mutate(
      {
        id: boleto.id,
        edicao: {
          vencimento: vencimento || null,
          valor: valorDoCampo(valorDigitos) ?? null,
          beneficiario_nome: quemCobra,
          descricao,
          loja: loja || null,
        },
      },
      { onSuccess: aoFechar },
    );

  return (
    <li className="flex flex-col gap-[12px] rounded-[12px] border border-caixa-accent bg-caixa-surface p-[16px]">
      <Campo rotulo="VENCIMENTO" htmlFor={`${id}-vencimento`}>
        <CampoTexto id={`${id}-vencimento`} type="date" valor={vencimento} onChange={setVencimento} />
      </Campo>
      <Campo rotulo="VALOR" htmlFor={`${id}-valor`}>
        <CampoMoeda id={`${id}-valor`} digitos={valorDigitos} onChange={setValorDigitos} />
      </Campo>
      <Campo rotulo="QUEM COBRA" htmlFor={`${id}-quem`}>
        <CampoTexto id={`${id}-quem`} valor={quemCobra} onChange={setQuemCobra} maxLength={200} />
      </Campo>
      <Campo rotulo="DESCRIÇÃO" htmlFor={`${id}-descricao`}>
        <CampoTexto
          id={`${id}-descricao`}
          valor={descricao}
          onChange={setDescricao}
          maxLength={200}
          placeholder="Ex.: mercadoria de outubro"
        />
      </Campo>
      <Campo rotulo="LOJA" htmlFor={`${id}-loja`}>
        <CampoSelecao id={`${id}-loja`} valor={loja} onChange={setLoja}>
          <option value="">Sem loja</option>
          {(lojas.data ?? []).map((opcao) => (
            <option key={opcao.id} value={opcao.id}>
              {opcao.nome_loja}
            </option>
          ))}
        </CampoSelecao>
      </Campo>
      {editar.isError && (
        <p role="alert" className="text-[13px] text-caixa-alerta">
          {editar.error.message}
        </p>
      )}
      <div className="flex justify-end gap-[8px]">
        <button type="button" onClick={aoFechar} className={CLASSE_ACAO}>
          Cancelar
        </button>
        <button
          type="button"
          disabled={editar.isPending}
          onClick={salvar}
          className="rounded-[8px] bg-caixa-accent px-[14px] py-[7px] text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {editar.isPending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </li>
  );
}

function LinhaDoBoleto({ boleto, aba, hoje }: { boleto: Boleto; aba: Aba; hoje: string }) {
  const pagar = usePagarBoleto();
  const desfazer = useDesfazerPagamento();
  const descartar = useDescartarBoleto();
  const [editando, setEditando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const tempo = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(tempo);
  }, [copiado]);

  if (editando) return <EdicaoDoBoleto boleto={boleto} aoFechar={() => setEditando(false)} />;

  return (
    <LinhaDoBoletoVista
      boleto={boleto}
      hoje={hoje}
      aba={aba}
      copiado={copiado}
      confirmandoDescarte={confirmandoDescarte}
      aoPagar={() => pagar.mutate(boleto.id)}
      aoDesfazer={() => desfazer.mutate(boleto.id)}
      aoEditar={() => setEditando(true)}
      aoCopiar={() => {
        void navigator.clipboard?.writeText(boleto.linha_digitavel).then(() => setCopiado(true));
      }}
      aoPedirDescarte={() => setConfirmandoDescarte(true)}
      aoConfirmarDescarte={() => descartar.mutate(boleto.id)}
      aoCancelarDescarte={() => setConfirmandoDescarte(false)}
    />
  );
}

/** O dono também recebe conta direto: a mesma ficha do formulário, com a
 *  loja opcional. */
function AdicionarBoleto({ aoFechar }: { aoFechar: () => void }) {
  const enviar = useEnviarBoletoDoPainel();
  const lojas = useLojasDoPainel();
  const [loja, setLoja] = useState("");

  return (
    <div className="flex flex-col gap-[12px] rounded-[12px] border border-caixa-border bg-caixa-bg p-[16px]">
      <Campo rotulo="LOJA (SE FOR DE UMA)" htmlFor="novo-boleto-loja">
        <CampoSelecao id="novo-boleto-loja" valor={loja} onChange={setLoja}>
          <option value="">Sem loja</option>
          {(lojas.data ?? []).map((opcao) => (
            <option key={opcao.id} value={opcao.id}>
              {opcao.nome_loja}
            </option>
          ))}
        </CampoSelecao>
      </Campo>
      <CartaoDoBoleto
        id="novo-boleto"
        loja={loja || undefined}
        enviar={enviar.mutateAsync}
        aoSalvar={aoFechar}
      />
      <button type="button" onClick={aoFechar} className={`${CLASSE_ACAO} self-end`}>
        Cancelar
      </button>
    </div>
  );
}

export function ListaDeBoletos() {
  const [aba, setAba] = useState<Aba>("A_PAGAR");
  const [adicionando, setAdicionando] = useState(false);
  const boletos = useBoletos(aba);
  const hoje = hojeLocal();

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-wrap items-center justify-between gap-[12px]">
        <div className="flex gap-[4px] rounded-[12px] border border-caixa-border bg-caixa-surface p-[4px]">
          {(
            [
              { valor: "A_PAGAR", rotulo: "A pagar" },
              { valor: "PAGO", rotulo: "Pagos" },
            ] as const
          ).map(({ valor, rotulo }) => (
            <button
              key={valor}
              type="button"
              aria-pressed={aba === valor}
              onClick={() => setAba(valor)}
              className={`rounded-[10px] px-[18px] py-[9px] text-[15px] font-medium transition ${
                aba === valor
                  ? "bg-caixa-accent-soft text-caixa-accent"
                  : "text-caixa-muted hover:text-caixa-ink"
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>
        {!adicionando && (
          <button
            type="button"
            onClick={() => setAdicionando(true)}
            className="rounded-[10px] bg-caixa-accent px-[16px] py-[10px] text-[14px] font-semibold text-white"
          >
            Adicionar boleto
          </button>
        )}
      </div>

      {adicionando && <AdicionarBoleto aoFechar={() => setAdicionando(false)} />}

      {boletos.isPending ? (
        <p className="text-[14px] text-caixa-muted">Carregando…</p>
      ) : boletos.isError ? (
        <p className="text-[14px] text-caixa-alerta">Não foi possível carregar os boletos.</p>
      ) : boletos.data.length === 0 ? (
        <p className="text-[14px] text-caixa-muted">
          {aba === "A_PAGAR" ? "Nenhum boleto a pagar." : "Nenhum boleto pago ainda."}
        </p>
      ) : (
        <ul className="flex flex-col gap-[12px]">
          {boletos.data.map((boleto) => (
            <LinhaDoBoleto key={boleto.id} boleto={boleto} aba={aba} hoje={hoje} />
          ))}
        </ul>
      )}
    </div>
  );
}

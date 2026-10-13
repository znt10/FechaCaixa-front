"use client";

import { useState } from "react";

import {
  SELOS,
  emDataBrasileira,
  emDataEHora,
  reais,
  umMesDepois,
} from "../mensalidade-da-tela";
import {
  useConfirmarPagamento,
  useMudarEmpresa,
  useRecusarPagamento,
  useRegistrarPagamento,
} from "../hooks/usePlataforma";
import type { EmpresaDaPlataforma, MudancaDaEmpresa } from "../services/mensalidade";

const TONS = {
  ok: "bg-caixa-accent-soft text-caixa-accent",
  aviso: "bg-caixa-warn-soft text-caixa-warn",
  alerta: "bg-caixa-alerta-soft text-caixa-alerta",
  neutro: "bg-caixa-faixa text-caixa-muted",
} as const;

const CAMPO =
  "rounded-[10px] border border-caixa-border bg-caixa-surface px-[10px] py-[7px] text-[14px] outline-none focus:border-caixa-accent";
const BOTAO =
  "rounded-[8px] border border-caixa-border px-[12px] py-[6px] text-[13px] font-semibold transition hover:border-caixa-accent/40 disabled:opacity-50";
const BOTAO_FORTE =
  "rounded-[8px] bg-caixa-accent px-[12px] py-[6px] text-[13px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50";

export function LinhaDaPlataforma({ empresa }: { empresa: EmpresaDaPlataforma }) {
  const mudar = useMudarEmpresa();
  const confirmar = useConfirmarPagamento();
  const recusar = useRecusarPagamento();
  const registrar = useRegistrarPagamento();

  // Valor e "paga ate" ficam escritos, como o ultimo pagamento; o Editar abre
  // os dois de uma vez. Eram uma caixa de digitar sempre aberta (o valor), que
  // lia diferente dos outros numeros da linha e salvava ao sair do campo.
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(empresa.valor_mensal ?? "");
  const [pagaAteEditado, setPagaAteEditado] = useState(empresa.paga_ate ?? "");
  const [registrando, setRegistrando] = useState(false);
  const [pagaAte, setPagaAte] = useState(() =>
    empresa.paga_ate ? umMesDepois(empresa.paga_ate) : "",
  );
  const [valorPago, setValorPago] = useState(empresa.valor_mensal ?? "");
  const [observacao, setObservacao] = useState("");

  const selo = SELOS[empresa.situacao];
  const ocupado = mudar.isPending || confirmar.isPending || recusar.isPending || registrar.isPending;
  const erro = mudar.error ?? confirmar.error ?? recusar.error ?? registrar.error;

  const abrirEdicao = () => {
    setValor(empresa.valor_mensal ?? "");
    setPagaAteEditado(empresa.paga_ate ?? "");
    setEditando(true);
  };

  const salvarEdicao = (evento: React.FormEvent) => {
    evento.preventDefault();
    const mudanca: MudancaDaEmpresa = {};
    if (valor && valor !== empresa.valor_mensal) mudanca.valor_mensal = valor;
    if (pagaAteEditado && pagaAteEditado !== empresa.paga_ate) {
      mudanca.paga_ate = pagaAteEditado;
    }
    if (Object.keys(mudanca).length === 0) {
      setEditando(false);
      return;
    }
    mudar.mutate({ id: empresa.id, mudanca }, { onSuccess: () => setEditando(false) });
  };

  const alternarIsenta = () =>
    mudar.mutate({ id: empresa.id, mudanca: { isenta: !empresa.isenta } });

  const alternarNuncaBloquear = () =>
    mudar.mutate({ id: empresa.id, mudanca: { nunca_bloquear: !empresa.nunca_bloquear } });

  const ativarOuDesativar = () => {
    if (
      empresa.ativo &&
      !window.confirm(
        `Desativar a ${empresa.nome}? O painel e o formulário das lojas param até você reativar.`,
      )
    ) {
      return;
    }
    mudar.mutate({ id: empresa.id, mudanca: { ativo: !empresa.ativo } });
  };

  const confirmarAviso = () => {
    if (!empresa.aguardando) return;
    if (window.confirm(`Confirmar ${reais(empresa.aguardando.valor)} da ${empresa.nome}?`)) {
      confirmar.mutate(empresa.aguardando.id);
    }
  };

  const recusarAviso = () => {
    if (!empresa.aguardando) return;
    if (window.confirm(`Recusar o pagamento informado pela ${empresa.nome}?`)) {
      recusar.mutate(empresa.aguardando.id);
    }
  };

  const salvarPagamento = (evento: React.FormEvent) => {
    evento.preventDefault();
    registrar.mutate(
      { id: empresa.id, dados: { paga_ate: pagaAte, valor: valorPago, observacao } },
      { onSuccess: () => { setRegistrando(false); setObservacao(""); } },
    );
  };

  return (
    <section className="flex flex-col gap-[12px] rounded-[12px] border border-caixa-border bg-caixa-surface px-[18px] py-[16px]">
      <div className="flex flex-wrap items-center justify-between gap-[10px]">
        <div className="flex items-center gap-[10px]">
          <h2 className="text-[16px] font-semibold">{empresa.nome}</h2>
          <span className={`rounded-full px-[10px] py-[3px] text-[12px] font-semibold ${TONS[selo.tom]}`}>
            {selo.rotulo}
          </span>
        </div>
        <button type="button" onClick={ativarOuDesativar} disabled={ocupado} className={BOTAO}>
          {empresa.ativo ? "Desativar" : "Ativar"}
        </button>
      </div>

      {editando ? (
        <form onSubmit={salvarEdicao} className="flex flex-wrap items-end gap-[10px] text-[14px]">
          <label className="flex flex-col gap-[4px] text-caixa-muted">
            Valor
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={valor}
              onChange={(evento) => setValor(evento.target.value)}
              className={`${CAMPO} w-[110px]`}
            />
          </label>
          <label className="flex flex-col gap-[4px] text-caixa-muted">
            Paga até
            <input
              type="date"
              value={pagaAteEditado}
              onChange={(evento) => setPagaAteEditado(evento.target.value)}
              className={CAMPO}
            />
          </label>
          <button type="submit" disabled={ocupado} className={BOTAO_FORTE}>
            Salvar
          </button>
          <button type="button" onClick={() => setEditando(false)} className={BOTAO}>
            Cancelar
          </button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-[16px] text-[14px]">
          <span className="text-caixa-muted">
            Valor:{" "}
            <strong className="text-caixa-ink">
              {empresa.valor_mensal ? reais(empresa.valor_mensal) : "—"}
            </strong>
          </span>
          <span className="text-caixa-muted">
            Paga até:{" "}
            <strong className="text-caixa-ink">
              {empresa.paga_ate ? emDataBrasileira(empresa.paga_ate) : "—"}
            </strong>
          </span>
          <span className="text-caixa-muted">
            Último pagamento:{" "}
            <strong className="text-caixa-ink">
              {empresa.ultimo_pagamento
                ? `${reais(empresa.ultimo_pagamento.valor)} em ${emDataBrasileira(
                    empresa.ultimo_pagamento.resolvido_em,
                  )}`
                : "nenhum"}
            </strong>
          </span>
          <button type="button" onClick={abrirEdicao} disabled={ocupado} className={BOTAO}>
            Editar
          </button>
        </div>
      )}

      {empresa.aguardando && (
        <div className="flex flex-wrap items-center justify-between gap-[10px] rounded-[10px] bg-caixa-warn-soft px-[14px] py-[10px] text-[14px] text-caixa-warn">
          <span>
            {empresa.aguardando.informado_por ?? "Alguém da empresa"} informou{" "}
            {reais(empresa.aguardando.valor)} em {emDataEHora(empresa.aguardando.informado_em)}.
          </span>
          <div className="flex gap-[8px]">
            <button type="button" onClick={confirmarAviso} disabled={ocupado} className={BOTAO_FORTE}>
              Confirmar
            </button>
            <button type="button" onClick={recusarAviso} disabled={ocupado} className={BOTAO}>
              Recusar
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-[16px] text-[14px]">
        <label className="flex items-center gap-[8px]">
          <input
            type="checkbox"
            checked={empresa.nunca_bloquear}
            onChange={alternarNuncaBloquear}
            disabled={ocupado}
            className="h-[16px] w-[16px] accent-caixa-accent"
          />
          Nunca bloquear
        </label>
        <label className="flex items-center gap-[8px]">
          <input
            type="checkbox"
            checked={empresa.isenta}
            onChange={alternarIsenta}
            disabled={ocupado}
            className="h-[16px] w-[16px] accent-caixa-accent"
          />
          Isenta
        </label>
        <button
          type="button"
          onClick={() => setRegistrando((estava) => !estava)}
          className={BOTAO}
        >
          {registrando ? "Cancelar" : "Registrar pagamento"}
        </button>
      </div>

      {registrando && (
        <form onSubmit={salvarPagamento} className="flex flex-wrap items-end gap-[10px] text-[14px]">
          <label className="flex flex-col gap-[4px] text-caixa-muted">
            Paga até
            <input
              type="date"
              required
              value={pagaAte}
              onChange={(evento) => setPagaAte(evento.target.value)}
              className={CAMPO}
            />
          </label>
          <label className="flex flex-col gap-[4px] text-caixa-muted">
            Valor
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={valorPago}
              onChange={(evento) => setValorPago(evento.target.value)}
              className={`${CAMPO} w-[110px]`}
            />
          </label>
          <label className="flex min-w-[200px] flex-1 flex-col gap-[4px] text-caixa-muted">
            Observação
            <input
              value={observacao}
              placeholder="ex.: pagou em dinheiro"
              onChange={(evento) => setObservacao(evento.target.value)}
              className={CAMPO}
            />
          </label>
          <button type="submit" disabled={ocupado} className={BOTAO_FORTE}>
            Salvar
          </button>
        </form>
      )}

      {erro && (
        <p className="text-[14px] font-medium text-caixa-alerta">
          {erro instanceof Error ? erro.message : "Não foi possível salvar."}
        </p>
      )}
    </section>
  );
}

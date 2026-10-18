"use client";

import { useState } from "react";

import { haQuanto } from "../situacao-da-pluggy";
import type { ConexaoPluggy, EstadoDaConexao } from "../services/pluggy";
import { ConexaoAberta } from "./ConexaoAberta";
import { BOTAO } from "./estilos";

const SELOS: Record<EstadoDaConexao, { rotulo: string; classe: string }> = {
  ATIVA: { rotulo: "Funcionando", classe: "bg-caixa-accent-soft text-caixa-accent" },
  COM_ERRO: { rotulo: "Caiu", classe: "bg-caixa-alerta-soft text-caixa-alerta" },
  CONFIGURANDO: { rotulo: "Configurando", classe: "bg-caixa-warn-soft text-caixa-warn" },
  DESLIGADA: { rotulo: "Desligada", classe: "bg-caixa-faixa text-caixa-muted" },
};

const diaEMes = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

export function LinhaDaConexao({ conexao }: { conexao: ConexaoPluggy }) {
  const [aberta, setAberta] = useState(false);
  const selo = SELOS[conexao.estado];

  return (
    <section className="flex flex-col gap-[12px] rounded-[12px] border border-caixa-border bg-caixa-surface px-[18px] py-[16px]">
      <div className="flex flex-wrap items-center justify-between gap-[10px]">
        <div className="flex flex-wrap items-center gap-[10px]">
          <h2 className="text-[16px] font-semibold">{conexao.empresa.nome}</h2>
          <span className={`rounded-full px-[10px] py-[3px] text-[12px] font-semibold ${selo.classe}`}>
            {selo.rotulo}
          </span>
          <span className="text-[13px] text-caixa-muted">{conexao.email}</span>
        </div>
        <button type="button" onClick={() => setAberta((estava) => !estava)} className={BOTAO}>
          {aberta ? "Fechar" : "Abrir"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-[16px] text-[14px] text-caixa-muted">
        {conexao.conectada_em && <span>Conectada em {diaEMes(conexao.conectada_em)}</span>}
        <span>
          Última busca:{" "}
          <strong className="text-caixa-ink">
            {conexao.ultima_busca_ok_em
              ? haQuanto(conexao.ultima_busca_ok_em, new Date())
              : "nunca"}
          </strong>
        </span>
        {conexao.contas.length > 0 && (
          <span>
            Contas:{" "}
            <strong className="text-caixa-ink">
              {conexao.contas.map((conta) => conta.numero).join(", ")}
            </strong>
          </span>
        )}
      </div>

      {conexao.estado === "COM_ERRO" && conexao.ultimo_erro && (
        <p className="rounded-[10px] bg-caixa-alerta-soft px-[14px] py-[10px] text-[14px] font-medium text-caixa-alerta">
          {conexao.ultimo_erro}
        </p>
      )}

      {aberta && <ConexaoAberta conexao={conexao} />}
    </section>
  );
}

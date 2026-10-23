"use client";

import { useState } from "react";

import { LinhaDaConexao } from "@/features/pluggy/components/LinhaDaConexao";
import { BOTAO, BOTAO_FORTE, CAMPO } from "@/features/pluggy/components/estilos";
import { useCriarConexao, usePainelDaPluggy } from "@/features/pluggy/hooks/usePluggy";
import { usePainelDaPlataforma } from "@/features/mensalidade/hooks/usePlataforma";

/**
 * Pluggy: o extrato do banco chegando sozinho, empresa por empresa.
 *
 * Os contadores dizem se alguma conexão caiu antes de rolar a lista. A conexão
 * nasce só com empresa e e-mail; as credenciais entram na conexão aberta.
 */
export default function PluggyPage() {
  const painel = usePainelDaPluggy({ habilitado: true });
  // Todas, mesmo as já conectadas: a empresa com lojas de donos diferentes
  // ganha uma conexão por titular.
  const empresas = usePainelDaPlataforma().data?.empresas ?? [];
  const criar = useCriarConexao();

  const [criando, setCriando] = useState(false);
  const [empresaId, setEmpresaId] = useState("");
  const [email, setEmail] = useState("");

  const contadores = painel.data?.contadores;
  const conexoes = painel.data?.conexoes ?? [];

  const salvar = (evento: React.FormEvent) => {
    evento.preventDefault();
    criar.mutate(
      { empresa_id: empresaId, email },
      {
        onSuccess: () => {
          setCriando(false);
          setEmpresaId("");
          setEmail("");
        },
      },
    );
  };

  return (
    <main className="mx-auto max-w-[1440px] px-[16px] pb-[60px] md:px-[40px]">
      <div className="flex flex-wrap items-end justify-between gap-[16px] py-[28px]">
        <div className="flex flex-col gap-[2px]">
          <h1 className="text-[22px] font-bold leading-[1.2]">Pluggy</h1>
          <p className="text-[14px] leading-[1.4] text-caixa-muted">
            O extrato do banco chegando sozinho, sem arquivo.
          </p>
        </div>
        <button type="button" onClick={() => setCriando((estava) => !estava)} className={BOTAO}>
          {criando ? "Cancelar" : "Nova conexão"}
        </button>
      </div>

      {criando && (
        <form
          onSubmit={salvar}
          className="mb-[20px] flex flex-wrap items-end gap-[10px] rounded-[12px] border border-caixa-border bg-caixa-surface px-[18px] py-[16px] text-[14px]"
        >
          <label className="flex flex-col gap-[4px] text-caixa-muted">
            Empresa
            <select
              required
              value={empresaId}
              onChange={(evento) => setEmpresaId(evento.target.value)}
              className={CAMPO}
            >
              <option value="">Escolha</option>
              {empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[220px] flex-1 flex-col gap-[4px] text-caixa-muted">
            E-mail da conta na Pluggy
            <input
              type="email"
              required
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              placeholder="o mesmo do Meu Pluggy e do Dashboard"
              className={CAMPO}
            />
          </label>
          <button type="submit" disabled={criar.isPending} className={BOTAO_FORTE}>
            Criar
          </button>
          {criar.error && (
            <p className="w-full text-[14px] font-medium text-caixa-alerta">
              {criar.error instanceof Error ? criar.error.message : "Não foi possível criar."}
            </p>
          )}
        </form>
      )}

      {painel.error && (
        <p className="rounded-[12px] border border-caixa-alerta/30 bg-caixa-alerta-soft px-[20px] py-[16px] text-[14px] font-medium text-caixa-alerta">
          {painel.error instanceof Error ? painel.error.message : "Não foi possível carregar a Pluggy."}
        </p>
      )}

      {painel.isPending && <p className="text-[15px] text-caixa-muted">Carregando conexões...</p>}

      {contadores && (
        <div className="mb-[20px] flex flex-wrap gap-[12px]">
          {[
            { rotulo: "funcionando", valor: contadores.funcionando },
            { rotulo: "caídas", valor: contadores.caidas },
            { rotulo: "configurando", valor: contadores.configurando },
          ].map((contador) => (
            <div
              key={contador.rotulo}
              className="min-w-[160px] flex-1 rounded-[12px] border border-caixa-border bg-caixa-surface px-[18px] py-[14px]"
            >
              <p className="text-[24px] font-semibold tabular-nums">{contador.valor}</p>
              <p className="text-[13px] text-caixa-muted">{contador.rotulo}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-[12px]">
        {conexoes.map((conexao) => (
          <LinhaDaConexao key={conexao.id} conexao={conexao} />
        ))}
      </div>
    </main>
  );
}

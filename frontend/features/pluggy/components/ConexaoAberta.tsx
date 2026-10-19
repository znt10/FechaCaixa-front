"use client";

import { useState } from "react";

import {
  useBuscarAgora,
  useMudarConexao,
  useTestarConexao,
  useVincularContas,
} from "../hooks/usePluggy";
import type { ConexaoPluggy } from "../services/pluggy";
import { BOTAO, BOTAO_FORTE, CAMPO } from "./estilos";

const diaEMes = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

/** Credenciais, teste, vínculo das contas e as ações de uma conexão. */
export function ConexaoAberta({ conexao }: { conexao: ConexaoPluggy }) {
  const mudar = useMudarConexao();
  const testar = useTestarConexao();
  const vincular = useVincularContas();
  const buscar = useBuscarAgora();

  const [email, setEmail] = useState(conexao.email);
  const [clientId, setClientId] = useState(conexao.client_id);
  const [segredo, setSegredo] = useState("");
  const [itemIds, setItemIds] = useState(conexao.item_ids);
  // Só o que o dono mexeu; o resto vale a sugestão do servidor.
  const [escolhas, setEscolhas] = useState<Record<string, string>>({});

  const ocupado = mudar.isPending || testar.isPending || vincular.isPending || buscar.isPending;
  const erro = mudar.error ?? testar.error ?? vincular.error ?? buscar.error;
  const resultado = testar.data;

  const salvar = (evento: React.FormEvent) => {
    evento.preventDefault();
    // O segredo nunca volta do servidor: vazio quer dizer "manter o salvo".
    mudar.mutate(
      {
        id: conexao.id,
        mudanca: {
          email,
          client_id: clientId,
          item_ids: itemIds,
          ...(segredo ? { client_secret: segredo } : {}),
        },
      },
      { onSuccess: () => setSegredo("") },
    );
  };

  const contaEscolhida = (pluggyId: string, sugerida: string | null) =>
    escolhas[pluggyId] ?? sugerida ?? "";

  const ativar = () => {
    if (!resultado) return;
    const vinculos = resultado.contas
      .map((conta) => ({
        pluggy_account_id: conta.pluggy_account_id,
        conta_bancaria_id: contaEscolhida(conta.pluggy_account_id, conta.conta_bancaria_sugerida),
      }))
      .filter((vinculo) => vinculo.conta_bancaria_id);
    vincular.mutate({ id: conexao.id, vinculos });
  };

  const desligar = () => {
    if (!window.confirm(`Desligar a Pluggy da ${conexao.empresa.nome}? O extrato volta a vir só por arquivo.`)) {
      return;
    }
    mudar.mutate({ id: conexao.id, mudanca: { estado: "DESLIGADA" } });
  };

  return (
    <div className="flex flex-col gap-[14px] border-t border-caixa-border pt-[14px]">
      <form onSubmit={salvar} className="flex flex-wrap items-end gap-[10px] text-[14px]">
        <label className="flex flex-col gap-[4px] text-caixa-muted">
          E-mail da conta na Pluggy
          <input
            type="email"
            required
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            className={`${CAMPO} w-[260px]`}
          />
        </label>
        <label className="flex flex-col gap-[4px] text-caixa-muted">
          Client ID
          <input
            value={clientId}
            onChange={(evento) => setClientId(evento.target.value)}
            className={`${CAMPO} w-[260px]`}
          />
        </label>
        <label className="flex flex-col gap-[4px] text-caixa-muted">
          Client Secret
          <input
            type="password"
            autoComplete="new-password"
            value={segredo}
            placeholder={conexao.segredo_salvo_em ? `Salvo em ${diaEMes(conexao.segredo_salvo_em)}` : ""}
            onChange={(evento) => setSegredo(evento.target.value)}
            className={`${CAMPO} w-[260px]`}
          />
        </label>
        <label className="flex min-w-[220px] flex-1 flex-col gap-[4px] text-caixa-muted">
          Item IDs
          <input
            value={itemIds}
            placeholder="separados por vírgula"
            onChange={(evento) => setItemIds(evento.target.value)}
            className={CAMPO}
          />
        </label>
        <button type="submit" disabled={ocupado} className={BOTAO_FORTE}>
          Salvar
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-[8px]">
        <button type="button" onClick={() => testar.mutate(conexao.id)} disabled={ocupado} className={BOTAO}>
          {testar.isPending ? "Testando..." : "Testar"}
        </button>
        <button type="button" onClick={() => buscar.mutate(conexao.id)} disabled={ocupado} className={BOTAO}>
          {buscar.isPending ? "Buscando..." : "Buscar agora"}
        </button>
        <button type="button" onClick={desligar} disabled={ocupado} className={BOTAO}>
          Desligar
        </button>
      </div>

      {resultado && (
        <div className="flex flex-col gap-[10px] rounded-[10px] bg-caixa-faixa px-[14px] py-[12px] text-[14px]">
          {resultado.contas.length === 0 && (
            <p className="text-caixa-muted">A Pluggy não encontrou nenhuma conta.</p>
          )}
          {resultado.contas.map((conta) => (
            <label
              key={conta.pluggy_account_id}
              className="flex flex-wrap items-center justify-between gap-[10px]"
            >
              <span>
                {conta.nome} <span className="text-caixa-muted">· {conta.numero}</span>
              </span>
              <select
                value={contaEscolhida(conta.pluggy_account_id, conta.conta_bancaria_sugerida)}
                onChange={(evento) =>
                  setEscolhas((antes) => ({ ...antes, [conta.pluggy_account_id]: evento.target.value }))
                }
                className={CAMPO}
              >
                <option value="">Não vincular</option>
                {resultado.contas_da_empresa.map((daEmpresa) => (
                  <option key={daEmpresa.id} value={daEmpresa.id}>
                    {daEmpresa.banco_nome} {daEmpresa.numero} · {daEmpresa.loja}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <div>
            <button type="button" onClick={ativar} disabled={ocupado} className={BOTAO_FORTE}>
              {vincular.isPending ? "Ativando..." : "Ativar"}
            </button>
          </div>
        </div>
      )}

      {erro && (
        <p className="text-[14px] font-medium text-caixa-alerta">
          {erro instanceof Error ? erro.message : "Não foi possível concluir."}
        </p>
      )}
    </div>
  );
}

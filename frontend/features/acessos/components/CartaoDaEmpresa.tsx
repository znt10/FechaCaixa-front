"use client";

import { useState } from "react";

import { avisoDoGerente, rotuloDaSituacao } from "../acessos-da-tela";
import { useAdicionarGerente, useMudarModulos, useReenviarLink } from "../hooks/useAcessos";
import type { EmpresaComAcessos, NovoGerente } from "../services/acessos";
import { ChavesDosModulos } from "./ChavesDosModulos";
import { BOTAO } from "./estilos";
import { FormularioDeGerente } from "./FormularioDeGerente";

const COR = {
  ATIVO: "bg-emerald-100 text-emerald-900",
  AGUARDANDO_SENHA: "bg-amber-100 text-amber-900",
  DESATIVADO: "bg-zinc-200 text-zinc-700",
} as const;

/** Uma empresa: os módulos contratados e quem entra como gerente. */
export function CartaoDaEmpresa({ empresa }: { empresa: EmpresaComAcessos }) {
  const modulos = useMudarModulos();
  const adicionar = useAdicionarGerente();
  const reenviar = useReenviarLink();
  const [adicionando, setAdicionando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const erro = modulos.error ?? adicionar.error ?? reenviar.error;

  const novoGerente = async (gerente: NovoGerente) => {
    const resposta = await adicionar.mutateAsync({ id: empresa.id, gerente });
    setAviso(avisoDoGerente(gerente.email, resposta.email_enviado));
    setAdicionando(false);
  };

  const reenviarLink = async (userId: number, email: string) => {
    const { email_enviado } = await reenviar.mutateAsync({ id: empresa.id, userId });
    setAviso(
      email_enviado ? `Link enviado de novo para ${email}.` : "O e-mail não saiu. Tente de novo.",
    );
  };

  return (
    <section className="cartao-caixa flex flex-col gap-[14px] rounded-[12px] border border-caixa-border bg-caixa-surface px-[16px] py-[18px] md:px-[24px]">
      <div className="flex flex-wrap items-center gap-[10px]">
        <h2 className="text-[17px] font-bold">{empresa.nome}</h2>
        {!empresa.ativo && (
          <span className="rounded-[8px] bg-zinc-200 px-[8px] py-[2px] text-[12px] font-semibold text-zinc-700">
            Desativada
          </span>
        )}
      </div>

      <ChavesDosModulos
        modulos={empresa.modulos}
        ocupado={modulos.isPending}
        onMudar={(mudanca) => modulos.mutate({ id: empresa.id, modulos: mudanca })}
      />

      <div className="flex flex-col gap-[8px] border-t border-caixa-border pt-[12px]">
        <span className="text-[13px] font-semibold text-caixa-muted">Gerentes</span>
        {empresa.gerentes.length === 0 && (
          <p className="text-[14px] text-caixa-muted">Nenhum gerente ainda.</p>
        )}
        <ul className="flex flex-col gap-[6px]">
          {empresa.gerentes.map((gerente) => (
            <li key={gerente.id} className="flex flex-wrap items-center gap-x-[12px] gap-y-[4px] text-[14px]">
              <span className="font-medium">{gerente.nome || "Sem nome"}</span>
              <span className="break-all text-caixa-muted">{gerente.email}</span>
              <span className={`rounded-[8px] px-[8px] py-[2px] text-[12px] font-semibold ${COR[gerente.situacao]}`}>
                {rotuloDaSituacao(gerente.situacao)}
              </span>
              {gerente.situacao === "AGUARDANDO_SENHA" && (
                <button
                  type="button"
                  disabled={reenviar.isPending}
                  onClick={() => reenviarLink(gerente.id, gerente.email).catch(() => {})}
                  className="text-[13px] font-semibold text-caixa-accent disabled:opacity-60"
                >
                  Reenviar link
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {aviso && <p className="text-[14px] font-medium text-caixa-accent">{aviso}</p>}
      {erro && (
        <p className="text-[14px] font-medium text-caixa-alerta">
          {erro instanceof Error ? erro.message : "Não deu certo. Tente de novo."}
        </p>
      )}

      {adicionando ? (
        <FormularioDeGerente
          rotulo="Adicionar gerente"
          ocupado={adicionar.isPending}
          onEnviar={(gerente) => novoGerente(gerente).catch(() => {})}
        />
      ) : (
        <div>
          <button type="button" onClick={() => { setAviso(null); setAdicionando(true); }} className={BOTAO}>
            Adicionar gerente
          </button>
        </div>
      )}
    </section>
  );
}

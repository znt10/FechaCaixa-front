"use client";

import { estadoDoPortao } from "../mensalidade-da-tela";
import { useMinhaMensalidade } from "../hooks/useMensalidade";
import { EmpresaDesativada } from "./EmpresaDesativada";
import { FaixaDaMensalidade } from "./FaixaDaMensalidade";
import { TelaDePagamento } from "./TelaDePagamento";

/**
 * Entre a barra do topo e o conteúdo do painel.
 *
 * A barra fica fora de propósito: a pessoa bloqueada precisa poder sair e
 * trocar de login.
 */
export function PortaoDaMensalidade({ children }: { children: React.ReactNode }) {
  const mensalidade = useMinhaMensalidade();
  const estado = estadoDoPortao(mensalidade.data);

  if (estado === "DESATIVADA") return <EmpresaDesativada />;
  if (estado === "BLOQUEADA" && mensalidade.data) {
    return <TelaDePagamento mensalidade={mensalidade.data} />;
  }

  return (
    <>
      <FaixaDaMensalidade mensalidade={mensalidade.data} />
      {children}
    </>
  );
}

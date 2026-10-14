import { emReais } from "@/features/fechamento/painel-dados";
import type { UsuarioAtual } from "@/shared/services/auth";

import type { MinhaMensalidade, SituacaoDaMensalidade } from "./services/mensalidade";

// O que a mensalidade calcula sozinha, fora do componente — mesmo caminho de
// `notas-da-tela` e `banco-da-tela`: aqui se testa sem renderizar nada.

export const MENSAGEM_EMPRESA_DESATIVADA =
  "Esta empresa está desativada no FechaCaixa. Fale com o responsável.";

export const reais = (valor?: string | null) => `R$ ${emReais(Number(valor ?? 0))}`;

const plural = (quantidade: number, um: string, varios: string) =>
  `${quantidade} ${quantidade === 1 ? um : varios}`;

/** "2026-10-05" → "05/10/2026", sem passar por Date (o fuso trocaria o dia). */
export const emDataBrasileira = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

const DIA_E_HORA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** "30/09 às 14:05", no horário de Brasília, seja qual for o do navegador. */
export const emDataEHora = (iso: string) =>
  DIA_E_HORA.format(new Date(iso)).replace(", ", " às ");

/** Um mês depois, no mesmo dia, limitado a 28 como o backend. */
export const umMesDepois = (iso: string) => {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  const [anoNovo, mesNovo] = mes === 12 ? [ano + 1, 1] : [ano, mes + 1];
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${anoNovo}-${dois(mesNovo)}-${dois(Math.min(dia, 28))}`;
};

export type Faixa = { tom: "aviso" | "alerta" | "info"; texto: string; mostraPix: boolean };

/** A faixa do topo do painel. `null` quando não há o que dizer. */
export const faixaDaMensalidade = (mensalidade?: MinhaMensalidade): Faixa | null => {
  if (!mensalidade) return null;
  const valor = reais(mensalidade.valor);

  switch (mensalidade.situacao) {
    case "VENCENDO": {
      const dias = mensalidade.dias ?? 0;
      const quando =
        dias === 0 ? "vence hoje" : dias === 1 ? "vence amanhã" : `vence em ${dias} dias`;
      return { tom: "aviso", texto: `Sua mensalidade de ${valor} ${quando}.`, mostraPix: true };
    }
    case "ATRASADA": {
      const atraso = `Sua mensalidade de ${valor} está vencida há ${plural(
        mensalidade.dias ?? 0,
        "dia",
        "dias",
      )}.`;
      // Quem nunca bloqueia não recebe promessa de bloqueio.
      const bloqueio = mensalidade.bloqueia_em
        ? ` O painel é bloqueado em ${emDataBrasileira(mensalidade.bloqueia_em)}.`
        : "";
      return { tom: "alerta", texto: atraso + bloqueio, mostraPix: true };
    }
    case "AGUARDANDO":
      return {
        tom: "info",
        texto: mensalidade.aguardando
          ? `Pagamento informado em ${emDataEHora(
              mensalidade.aguardando.informado_em,
            )}, aguardando confirmação.`
          : "Pagamento informado, aguardando confirmação.",
        mostraPix: false,
      };
    default:
      return null;
  }
};

export type EstadoDoPortao = "LIBERADO" | "BLOQUEADA" | "DESATIVADA";

/**
 * O painel mostra o conteúdo ou uma tela no lugar dele.
 *
 * Sem resposta (carregando, falhou) deixa passar: quem barra de verdade é o
 * servidor, e trancar a tela por um soluço de rede tiraria o painel de quem
 * está em dia.
 */
export const estadoDoPortao = (mensalidade?: MinhaMensalidade): EstadoDoPortao => {
  if (mensalidade?.situacao === "BLOQUEADA") return "BLOQUEADA";
  if (mensalidade?.situacao === "DESATIVADA") return "DESATIVADA";
  return "LIBERADO";
};

export const SELOS: Record<
  SituacaoDaMensalidade,
  { rotulo: string; tom: "ok" | "aviso" | "alerta" | "neutro" }
> = {
  EM_DIA: { rotulo: "Em dia", tom: "ok" },
  VENCENDO: { rotulo: "Vencendo", tom: "aviso" },
  ATRASADA: { rotulo: "Atrasada", tom: "alerta" },
  AGUARDANDO: { rotulo: "Aguardando confirmação", tom: "aviso" },
  BLOQUEADA: { rotulo: "Bloqueada", tom: "alerta" },
  ISENTA: { rotulo: "Isenta", tom: "neutro" },
  DESATIVADA: { rotulo: "Desativada", tom: "neutro" },
};

/** A tela Plataforma é do dono da plataforma, e não do cargo "Admin" da empresa. */
export const mostrarPlataforma = (usuario?: UsuarioAtual) => usuario?.super === true;

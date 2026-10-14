import {
  fimDaSemana,
  fimDoMes,
  inicioDaSemana,
  inicioDoMes,
  mesDe,
} from "@/features/fechamento/painel-dados";
import type { UsuarioAtual } from "@/shared/services/auth";

import type {
  FiltroDeComprovantes,
  Situacao,
  TotaisDeComprovantes,
} from "./services/comprovantes";

// O que a tela de comprovantes calcula sozinha, fora do componente — mesmo
// caminho de `banco-da-tela`: aqui dá para testar sem renderizar nada.

const semAcento = (texto?: string) =>
  (texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Mesma regra do extrato: o módulo E a gerência. Num erro de rede a área
 *  fica, para não sumir com o que o cliente comprou num soluço. */
export const mostrarAreaDeComprovantes = (resposta: {
  usuario?: UsuarioAtual;
  carregando: boolean;
  falhou: boolean;
}): boolean => {
  if (resposta.carregando) return false;
  if (resposta.falhou) return true;
  const cargo = semAcento(resposta.usuario?.group);
  const gerencia = cargo === "gerente" || cargo === "admin" || cargo === "administrador";
  return gerencia && resposta.usuario?.modulos?.comprovantes === true;
};

/** Os mesmos três recortes dos Gráficos e das Saídas: Dia, Semana, Mês. */
export type Granularidade = "DIA" | "SEMANA" | "MES";

export type EscolhasDosComprovantes = {
  granularidade: Granularidade;
  /** Âncora do Dia e da Semana. */
  dia: string;
  /** "AAAA-MM", âncora do Mês. */
  mes: string;
  loja: string;
  situacao: Situacao | "";
  pagina: number;
};

export const escolhasIniciais = (hoje: string): EscolhasDosComprovantes => ({
  granularidade: "MES",
  dia: hoje,
  mes: mesDe(hoje),
  loja: "",
  situacao: "",
  pagina: 1,
});

/** O recorte vira um intervalo só, que é o que a API entende. */
export const intervaloDasEscolhas = ({ granularidade, dia, mes }: EscolhasDosComprovantes) =>
  granularidade === "DIA"
    ? { de: dia, ate: dia }
    : granularidade === "SEMANA"
      ? { de: inicioDaSemana(dia), ate: fimDaSemana(dia) }
      : { de: inicioDoMes(mes), ate: fimDoMes(mes) };

/** O rótulo do cartão do total, no mesmo tom do fechamento de caixa. */
export const rotuloDoTotal = (granularidade: Granularidade) =>
  ({ DIA: "TOTAL DO DIA", SEMANA: "TOTAL DA SEMANA", MES: "TOTAL DO MÊS" })[granularidade];

export const montarFiltro = (escolhas: EscolhasDosComprovantes): FiltroDeComprovantes => {
  const filtro: FiltroDeComprovantes = { ...intervaloDasEscolhas(escolhas) };
  if (escolhas.loja) filtro.loja = escolhas.loja;
  if (escolhas.situacao) filtro.situacao = escolhas.situacao;
  if (escolhas.pagina > 1) filtro.page = escolhas.pagina;
  return filtro;
};

/** As linhas por loja embaixo do total. Sem nenhuma loja (a madrinha), só o
 *  total aparece: uma linha "Sem loja" igual ao total não diz nada. */
export const linhasDoResumo = (totais: TotaisDeComprovantes) =>
  totais.por_loja.some((linha) => linha.loja !== null)
    ? totais.por_loja.map(({ nome, valor }) => ({ nome, valor }))
    : [];

const ROTULOS: Record<Situacao, string> = {
  OK: "OK",
  CONFERIR: "Conferir",
  DESCARTADO: "Descartado",
};

export const rotuloDaSituacao = (situacao: Situacao) => ROTULOS[situacao];

/** Os botões do detalhe. Descartado não some: volta para conferir, e só soma
 * depois de confirmado de novo. */
export const acoesDoDetalhe = (situacao: Situacao) => ({
  principal: ({ CONFERIR: "confirmar", OK: "salvar", DESCARTADO: "voltar" } as const)[situacao],
  descartar: situacao !== "DESCARTADO",
});

/** ISO do servidor -> valor de <input type="datetime-local">, em São Paulo. */
export const paraDataLocal = (iso: string | null) => {
  if (!iso) return "";
  const partes = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  // "sv-SE" formata como "2026-10-13 10:03".
  return partes.replace(" ", "T");
};

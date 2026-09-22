/**
 * O formulário sob medida de cada empresa.
 *
 * O FechaCaixa nasceu numa rede de salgados e perguntava de salgado para todo
 * mundo. Cada empresa agora liga e desliga as perguntas opcionais, diz se usa
 * catálogo de itens e como chama o que vende. Quem decide é a gerência, na
 * tela Empresa, ou o dono da plataforma, no /admin.
 *
 * Aqui mora só a regra — sem componente —, para ser testada sem renderizar
 * nada. Mesmo caminho de `revisao-do-envio` e `notas-da-tela`.
 */

/** O que o backend manda sobre o formulário desta empresa. Tudo opcional: o
 *  front pode estar no ar antes do backend que manda os campos. */
export type ConfiguracaoDoFormulario = {
  pergunta_retirada?: boolean;
  pergunta_despesa?: boolean;
  pergunta_devolucao?: boolean;
  pergunta_consumo?: boolean;
  catalogo_ativo?: boolean;
  /** No plural: entra no meio de frase ("Houve perda de pães?"). */
  nome_dos_itens?: string;
};

export type PerguntaOpcional = "retirada" | "despesa" | "devolucao" | "consumo" | "perda";

const CAMPO_DA_PERGUNTA: Record<PerguntaOpcional, keyof ConfiguracaoDoFormulario> = {
  retirada: "pergunta_retirada",
  despesa: "pergunta_despesa",
  devolucao: "pergunta_devolucao",
  consumo: "pergunta_consumo",
  // A perda se lança POR item do catálogo: sem catálogo, não há o que
  // escolher na linha.
  perda: "catalogo_ativo",
};

/**
 * Quais perguntas opcionais o formulário mostra.
 *
 * `respondidas` diz em quais o turno aberto já tem "sim" — o caso real é a
 * correção de um turno enviado antes de a empresa desligar a pergunta. Ela
 * fica na tela mesmo desligada: o envio de uma correção leva o formulário
 * inteiro, e a pergunta escondida iria como "não teve", apagando o consumo
 * ou a perda que a loja tinha lançado.
 *
 * Campo ausente conta como ligado. Sumir com as perguntas por causa da ordem
 * do deploy seria a loja sem ter onde lançar a retirada do dia.
 */
export const perguntasVisiveis = (
  config: ConfiguracaoDoFormulario,
  respondidas: Record<PerguntaOpcional, boolean>,
): Record<PerguntaOpcional, boolean> => {
  const visivel = (pergunta: PerguntaOpcional) =>
    config[CAMPO_DA_PERGUNTA[pergunta]] !== false || respondidas[pergunta];

  return {
    retirada: visivel("retirada"),
    despesa: visivel("despesa"),
    devolucao: visivel("devolucao"),
    consumo: visivel("consumo"),
    perda: visivel("perda"),
  };
};

/** Como a empresa chama o que vende. "salgados" quando não veio nome — é o
 *  texto de antes, e "Houve perda de ?" seria pior do que ele. */
export const nomeDosItens = (config: ConfiguracaoDoFormulario) =>
  config.nome_dos_itens?.trim() || "salgados";

/** "Houve perda de ...", e não "Perdeu algum ...": com um nome só, no plural,
 *  não dá para saber se é "algum" ou "alguma". */
export const perguntaDePerda = (config: ConfiguracaoDoFormulario) =>
  `Houve perda de ${nomeDosItens(config)}?`;

export const tituloDoCatalogo = (config: ConfiguracaoDoFormulario) =>
  `Catálogo de ${nomeDosItens(config)}`;

export const avisoDeCatalogoVazio = (config: ConfiguracaoDoFormulario) =>
  `O catálogo de ${nomeDosItens(config)} está vazio. Cadastre os itens na tela Catálogo.`;

/**
 * A empresa usa catálogo de itens?
 *
 * Quem responde é o `/user/me/`, que carrega a flag da conta — e não a tela
 * Empresa, que responde 403 para o Funcionário, que também abre Saídas.
 *
 * As três respostas são as mesmas da aba de notas: carregando fica fora (para
 * a aba não piscar em toda abertura do painel de quem não usa catálogo), e
 * FALHOU fica dentro — o caso comum é o token vencido numa aba aberta desde
 * ontem, e sumir ali é afirmar "esta empresa não usa catálogo", que é
 * justamente o que não se sabe.
 */
export const usaCatalogo = (resposta: {
  usuario?: { modulos?: { catalogo?: boolean } };
  carregando: boolean;
  falhou: boolean;
}): boolean => {
  if (resposta.carregando) return false;
  if (resposta.falhou) return true;

  // Ausente conta como ligado: é o backend antigo, que não manda o campo.
  return resposta.usuario?.modulos?.catalogo !== false;
};

/** As quatro perguntas que a tela Empresa liga e desliga. A perda fica fora:
 *  ela acompanha o catálogo, que o resumo conta à parte. */
const PERGUNTAS_CONFIGURAVEIS = [
  "pergunta_retirada",
  "pergunta_despesa",
  "pergunta_devolucao",
  "pergunta_consumo",
] as const;

/**
 * O que o cartão do formulário mostra quando está recolhido.
 *
 * Quem recolhe precisa continuar sabendo o que está valendo, senão abrir de
 * novo vira o único jeito de conferir — e aí recolher não serviu para nada.
 *
 * "todas" e "nenhuma" por extenso: "4 de 4" faz procurar o que falta, e
 * "0 de 4" esconde num número o fato de o formulário estar sem pergunta
 * nenhuma.
 */
export const resumoDoFormulario = (config: ConfiguracaoDoFormulario): string => {
  const ligadas = PERGUNTAS_CONFIGURAVEIS.filter((campo) => config[campo] !== false).length;

  const quantas =
    ligadas === PERGUNTAS_CONFIGURAVEIS.length
      ? "todas as perguntas"
      : ligadas === 0
        ? "nenhuma pergunta"
        : `${ligadas} de ${PERGUNTAS_CONFIGURAVEIS.length} perguntas`;

  const catalogo =
    config.catalogo_ativo === false ? "sem catálogo" : `catálogo de ${nomeDosItens(config)}`;

  return `${quantas} · ${catalogo}`;
};

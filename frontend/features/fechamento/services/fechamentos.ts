import { apiV1Publico } from "@/shared/services/api";

// ======================================================
// 🔹 FECHAMENTO DE CAIXA
// ======================================================
// O formulario nao e mais aberto: quem responde por estas chamadas e o cookie
// httpOnly do aparelho, gravado quando alguem digitou o codigo da empresa. A
// empresa sai do cookie, e nao mais de um ?conta= na URL — que, sendo escolhido
// por quem chama, deixava qualquer um listar as lojas de qualquer cliente.

export type LojaOpcao = {
  id: string;
  nome_loja: string;
};

export type ResponsavelRetirada = {
  id: string;
  nome: string;
  ativo: boolean;
};

/** Quem toca a loja. Uma lista so, com duas marcas — o formulario faz dois
 *  seletores dela: quem fecha o caixa (gerente) e quem entra na lista de
 *  consumo (funcionario). As marcas se cruzam: gerente tambem come.
 *
 *  Nao e o "Funcionario" nem o "Gerente" de login do painel — esses sao
 *  ajudantes com senha. Esta pessoa entra pelo codigo da empresa no aparelho. */
export type Encarregado = {
  id: string;
  nome: string;
  pode_lancar_caixa: boolean;
  pode_consumir: boolean;
  ativo: boolean;
};

/** Uma linha de despesa dentro do envio do turno: no que gastou, e quanto.
 *
 *  Era um par de campos no fechamento, e cabia uma so por turno — o expediente
 *  gasta com gas, agua e remedio no mesmo dia. Sem cadastro por tras: a
 *  descricao e texto livre, ao contrario do consumo. */
export type DespesaDoTurno = {
  descricao: string;
  valor: string;
};

/** A mesma linha de volta do servidor, com o id. */
export type DespesaLancada = DespesaDoTurno & { id: string };

/** Uma linha de retirada dentro do envio do turno: quem levou, e quanto.
 *
 *  Era um par de campos no fechamento, e cabia uma pessoa por turno — o dono e
 *  a socia retiram no mesmo expediente. */
export type RetiradaDoTurno = {
  responsavel: string;
  valor: string;
};

/** A mesma linha de volta do servidor, com o nome junto. `nome` e nulo quando
 *  a pessoa foi apagada do cadastro — o valor continua somando. */
export type RetiradaLancada = RetiradaDoTurno & {
  id: string;
  responsavel: string | null;
  nome: string | null;
};

/** Uma linha de consumo dentro do envio do turno: quem comeu, e quanto. */
export type ConsumoDoTurno = {
  encarregado: string;
  valor: string;
};

/** Um item do catalogo, como o DRF devolve — snake_case cru, sem mapeamento,
 *  como Encarregado e ResponsavelRetirada ja sao neste arquivo. */
export type Salgado = {
  id: string;
  nome: string;
  ativo: boolean;
  categoria: string;
  categoria_nome: string;
  /** Se a CATEGORIA (nao o item) esta ativa. O endpoint devolve o catalogo
   *  inteiro de proposito — a correcao precisa achar item inativo para
   *  reidratar — entao e este campo que diz ao seletor do formulario o que
   *  ele pode oferecer para uma linha nova. */
  categoria_ativo: boolean;
};

/** Uma linha de desperdicio no envio: quantidade em unidades, sem valor —
 *  o catalogo nao tem preco, e nenhum dinheiro deixou a gaveta. */
export type DesperdicioDoTurno = { salgado: string; quantidade: number };


/** Manha e tarde na empresa de dois fechamentos; DIA em quem fecha o caixa uma
 *  vez por dia. Nao existe turno da noite. */
export type Periodo = "MANHA" | "TARDE" | "DOMINGO" | "DIA";

export type FechamentoPayload = {
  loja: string;
  /** O id de quem esta lancando. Era o nome digitado a mao — a mesma pessoa
   *  escrita de tres formas nao deixava somar o consumo dela no mes.
   *
   *  Nulo so na reposicao pelo painel: quem repoe um dia esquecido nao estava
   *  no turno, e nem sequer e um Encarregado (o gerente tem login, esta gente
   *  nao). Pelo formulario da loja o backend continua exigindo. */
  lancado_por: string | null;
  periodo: Periodo;
  pix: string;
  cartao: string;
  dinheiro: string;
  link_pagamento: string;
  houve_retirada: boolean;
  /** Quem levou dinheiro da gaveta, uma linha por pessoa. Vazio quando nao
   *  houve retirada. Numa correcao, a lista enviada substitui a anterior. */
  retiradas: RetiradaDoTurno[];
  /** O que a loja gastou no turno, uma linha por gasto. Vazio quando nao
   *  gastou nada. Numa correcao, a lista enviada substitui a anterior. */
  despesas: DespesaDoTurno[];
  /** O cliente pediu o dinheiro de volta. Fica registrada e NAO mexe no total:
   *  o dinheiro saiu da mesma gaveta que o funcionario contou, entao ela ja se
   *  descontou sozinha. */
  houve_devolucao: boolean;
  devolucao_valor?: string | null;
  /** Texto livre do turno inteiro. O formulario nao pergunta mais isto — foi
   *  substituido pela lista de itens perdidos, `desperdicios` — mas o campo
   *  continua existindo no modelo e nas telas de leitura. Ausente daqui de
   *  proposito: numa correcao, ausente e "nao mexi", e mandar `false`/`null`
   *  apagaria um desperdicio escrito antes desta mudanca. */
  houve_desperdicio?: boolean;
  desperdicio_detalhes?: string | null;
  /** O desperdicio do turno, uma linha por item do catalogo perdido. Ausente
   *  ou vazio quando nao houve nada a apontar. */
  desperdicios?: DesperdicioDoTurno[];
  /** O consumo de cada pessoa no turno, uma linha por pessoa. Vazio quando
   *  ninguem comeu. Numa correcao, a lista enviada substitui a anterior. */
  consumos: ConsumoDoTurno[];
};

export type FechamentoConfirmacao = {
  id: string;
  loja_nome: string;
  data: string;
  periodo: Periodo;
  /** A liquidez bruta: quanto a loja movimentou. Soma retirada e despesa de
   *  volta, porque as duas sairam da gaveta depois da venda. */
  total: string;
  /** O que saiu da gaveta e ficou anotado a parte: retirada, despesas e
   *  devolucao. Nao e o que foi descontado — so a devolucao nao volta. */
  registrado: string;
  despesas: DespesaLancada[];
  /** O consumo lancado, de volta: a confirmacao e o unico lugar em que o
   *  gerente reve o que digitou de cada pessoa. */
  consumos: ConsumoLancado[];
  /**
   * Quanto ainda sobra da janela de correcao, em segundos.
   *
   * Vem contado pelo servidor de proposito: o celular da loja costuma estar
   * com a hora errada, e um horario-limite absoluto ficaria a merce disso.
   * Aqui so medimos quanto tempo passou desde a resposta.
   */
  segundos_para_corrigir: number;
};

/** O lancamento de volta no formato do formulario, para a loja reabrir. */
export type FechamentoParaCorrigir = {
  id: string;
  loja: string;
  loja_nome: string;
  nome_funcionario: string;
  lancado_por: string | null;
  data: string;
  periodo: Periodo;
  pix: string | null;
  cartao: string | null;
  dinheiro: string | null;
  link_pagamento: string | null;
  houve_retirada: boolean;
  /** O resumo das linhas abaixo (a primeira pessoa e a soma). */
  responsavel_retirada: string | null;
  valor_retirado: string | null;
  retiradas: RetiradaLancada[];
  despesas: DespesaLancada[];
  houve_devolucao: boolean;
  devolucao_valor: string | null;
  houve_desperdicio: boolean;
  desperdicio_detalhes: string | null;
  /** As linhas de desperdicio do turno, com o nome do catalogo junto — mesma
   *  razao do consumo: sem o servidor devolver isto, corrigir outro campo do
   *  lancamento mandaria a lista vazia de volta e apagaria o desperdicio. */
  desperdicios: DesperdicioLancado[];
  consumos: ConsumoLancado[];
  segundos_para_corrigir: number;
};

/** O consumo como o servidor devolve: com o nome do cadastro junto. */
export type ConsumoLancado = {
  id: string;
  encarregado: string;
  nome: string;
  valor: string;
};

/** O desperdicio como o servidor devolve: com o nome e a categoria do
 *  catalogo junto, como o DesperdicioLidoSerializer aninha no fechamento. */
export type DesperdicioLancado = {
  id: string;
  salgado: string;
  nome: string;
  categoria_nome: string;
  quantidade: number;
};

export const getLojasDoFormulario = async (): Promise<LojaOpcao[]> => {
  const res = await apiV1Publico("/lojas/");
  const data = await res.json();
  // Compatível com resposta paginada do DRF e com array cru.
  return data.results ?? data;
};

export const getResponsaveisRetirada = async (): Promise<ResponsavelRetirada[]> => {
  const res = await apiV1Publico("/responsaveis-retirada/");
  const data = await res.json();
  return data.results ?? data;
};

export const getEncarregados = async (): Promise<Encarregado[]> => {
  const res = await apiV1Publico("/encarregados/");
  const data = await res.json();
  return data.results ?? data;
};

export const getSalgados = async (): Promise<Salgado[]> => {
  const res = await apiV1Publico("/salgados/");
  const data = await res.json();
  return data.results ?? data;
};

export type TurnosDoDia = {
  data: string;
  periodos: Periodo[];
  /** "Domingo", "Feriado: Natal"... ou null num dia comum. */
  motivo: string | null;
};

/**
 * Quais turnos existem hoje nesta conta.
 *
 * Vem do backend em vez de ser calculado aqui porque a lista de feriados
 * (nacionais + os locais da conta) ja mora la, e duas copias da mesma regra
 * acabam divergindo.
 */
export const getTurnosDoDia = async (): Promise<TurnosDoDia> => {
  const res = await apiV1Publico("/fechamentos-caixa/turnos/");
  return res.json();
};

export const postFechamento = async (
  payload: FechamentoPayload,
): Promise<FechamentoConfirmacao> => {
  const res = await apiV1Publico("/fechamentos-caixa/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return res.json();
};

// ======================================================
// 🔹 JANELA DE CORRECAO (20 minutos)
// ======================================================
// Os dois endpoints abaixo sao publicos como o POST, e o id do lancamento faz
// as vezes de senha: e um uuid4, devolvido so para quem acabou de enviar.
// Passados os 20 minutos o backend responde 403 e nem o id serve mais.

export const getFechamentoParaCorrigir = async (
  id: string,
): Promise<FechamentoParaCorrigir> => {
  const res = await apiV1Publico(`/fechamentos-caixa/${id}/correcao/`);
  return res.json();
};

export const patchFechamento = async (
  id: string,
  payload: FechamentoPayload,
): Promise<FechamentoConfirmacao> => {
  const res = await apiV1Publico(`/fechamentos-caixa/${id}/correcao/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.json();
};

/** Cancela o que a loja acabou de mandar. Publico como o POST e a correcao: o
 *  id e um uuid4 devolvido so a quem enviou, e passados os 20 minutos o backend
 *  recusa mesmo com o id certo. */
export const cancelarFechamentoDaLoja = async (id: string): Promise<void> => {
  await apiV1Publico(`/fechamentos-caixa/${id}/cancelar/`, { method: "POST" });
};

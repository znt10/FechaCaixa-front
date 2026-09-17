import { emReais } from "@/features/fechamento/painel-dados";

import type {
  FiltroDeNotas,
  GrupoDeDespesa,
  NotaFiscal,
  NotaRecusada,
  PaginaDeNotas,
  ResultadoDoLote,
} from "./services/notas";
import type { UsuarioAtual } from "@/shared/services/auth";

// O que a tela de notas fiscais calcula sozinha, fora do componente: montar o
// filtro, agrupar as recusas do lote e formatar a linha da tabela. Aqui isso
// pode ser testado sem renderizar nada — mesmo caminho de `revisao-do-envio` e
// `consumo-editavel`.

/** O que a gerência escolheu na barra de filtros. */
export type EscolhasDaTela = {
  /** A fila de trabalho: as que ainda faltam classificar. */
  soPendentes: boolean;
  loja: string;
  de: string;
  ate: string;
  pagina: number;
};

export const ESCOLHAS_INICIAIS: EscolhasDaTela = {
  // Abre na fila de trabalho, não no arquivo morto.
  soPendentes: true,
  loja: "",
  de: "",
  ate: "",
  pagina: 1,
};

/**
 * As escolhas viram os parâmetros da listagem.
 *
 * Só entra o que a pessoa realmente escolheu. "Ver tudo" é a AUSÊNCIA de
 * `classificada`, e não `classificada=true`: mandar true traria só as já
 * classificadas, exatamente o contrário do que o rótulo promete. E a página 1
 * omite `page` para a chave de cache dela ser a mesma da primeira abertura da
 * tela, em vez de duas entradas com a mesma lista dentro.
 */
export const montarFiltroDeNotas = (escolhas: EscolhasDaTela): FiltroDeNotas => {
  const filtro: FiltroDeNotas = {};

  if (escolhas.soPendentes) filtro.classificada = "false";
  if (escolhas.loja) filtro.loja = escolhas.loja;
  if (escolhas.de) filtro.de = escolhas.de;
  if (escolhas.ate) filtro.ate = escolhas.ate;
  if (escolhas.pagina > 1) filtro.page = escolhas.pagina;

  return filtro;
};

/**
 * A saída de uma página que deixou de existir.
 *
 * Classificar encolhe a lista quando o filtro é "só as que faltam". Quem
 * estiver na página 2 de uma lista que caiu para 40 notas pede uma página que
 * o servidor não tem mais: a listagem falha, e com ela somem os botões de
 * navegação — a tela fica num erro sem nenhum caminho de volta.
 *
 * Devolve o MESMO objeto quando já se está na primeira página, e não uma cópia
 * igual: a tela guarda estas escolhas em estado, e uma cópia nova faria a
 * busca ser refeita do zero por um clique que não mudou nada.
 */
export const voltarParaPrimeiraPagina = (escolhas: EscolhasDaTela): EscolhasDaTela =>
  escolhas.pagina === 1 ? escolhas : { ...escolhas, pagina: 1 };

/**
 * Trocar qualquer filtro devolve a pessoa para a primeira página.
 *
 * Na página 4 de um filtro antigo, o filtro novo quase sempre tem menos
 * páginas: o servidor devolveria uma lista vazia e a tela diria que não existe
 * nota nenhuma naquele filtro, quando existem — só não na página 4.
 */
export const trocarDeFiltro = (
  escolhas: EscolhasDaTela,
  mudanca: Partial<EscolhasDaTela>,
): EscolhasDaTela => ({ ...escolhas, ...mudanca, pagina: 1 });

/**
 * Um passo para frente ou para trás no paginador.
 *
 * Nunca abaixo da página 1: `page=0` é um pedido que o servidor recusa, e a
 * tela cairia num erro por causa de um clique num botão que já devia estar
 * desabilitado.
 */
export const andarDePagina = (
  escolhas: EscolhasDaTela,
  direcao: 1 | -1,
): EscolhasDaTela => ({
  ...escolhas,
  pagina: Math.max(escolhas.pagina + direcao, 1),
});

/** Um motivo de recusa e todos os arquivos que caíram por ele. */
export type GrupoDeRecusa = { motivo: string; arquivos: string[] };

/**
 * As recusas do lote, juntadas por motivo.
 *
 * Quem sobe o mês inteiro derruba dezenas de arquivos pela mesma causa (o XML
 * que já tinha sido lançado, o fornecedor que não é despesa). Uma linha por
 * arquivo viraria uma parede que ninguém lê, e é justo essa lista que precisa
 * ser lida: uma recusa despercebida faz a gerência achar que lançou a despesa
 * quando não lançou.
 *
 * A ordem dos motivos é a de aparição no lote, e nenhum arquivo é descartado
 * pelo caminho — nem o repetido.
 */
export const agruparRecusas = (recusadas: NotaRecusada[]): GrupoDeRecusa[] => {
  const porMotivo = new Map<string, GrupoDeRecusa>();

  for (const recusada of recusadas) {
    const grupo = porMotivo.get(recusada.motivo);
    if (grupo) grupo.arquivos.push(recusada.arquivo);
    else porMotivo.set(recusada.motivo, { motivo: recusada.motivo, arquivos: [recusada.arquivo] });
  }

  return [...porMotivo.values()];
};

/**
 * O que a nota traz no XML é a despesa; o PDF é só o desenho dela.
 *
 * Barrado aqui, antes de sair da máquina: mandar o PDF para o servidor só para
 * receber a mesma recusa seria uma espera à toa.
 */
const MOTIVO_NAO_E_XML =
  "Não é um arquivo XML. A nota entra pelo XML que o fornecedor manda por e-mail, e não pelo PDF impresso.";

/**
 * Separa, do que a pessoa soltou na tela, o que dá para mandar.
 *
 * O lote misto é o caso comum, não a exceção: a nota chega por e-mail em XML e
 * em PDF, e quem baixa a pasta do mês baixa os dois. Se os não-XML sumissem
 * aqui, a tela diria "8 notas entraram" sem uma palavra sobre os 2 PDFs — e a
 * gerência fecharia o mês achando que lançou uma despesa que não entrou. É o
 * mesmo desfecho das recusas do servidor, e por isso sai pelo mesmo lugar.
 */
export const separarOsXmls = <A extends { name: string }>(
  arquivos: A[],
): { xmls: A[]; descartados: GrupoDeRecusa[] } => {
  const xmls: A[] = [];
  const foraDoFormato: string[] = [];

  for (const arquivo of arquivos) {
    if (arquivo.name.toLowerCase().endsWith(".xml")) xmls.push(arquivo);
    else foraDoFormato.push(arquivo.name);
  }

  return {
    xmls,
    descartados: foraDoFormato.length
      ? [{ motivo: MOTIVO_NAO_E_XML, arquivos: foraDoFormato }]
      : [],
  };
};

/** O que a tela mostra depois de um lote: quantas entraram e tudo que ficou
 *  de fora, venha de onde vier. */
export type ResultadoNaTela = { importadas: number; recusadas: GrupoDeRecusa[] };

/**
 * Junta as duas metades da má notícia num lugar só.
 *
 * O arquivo que nem saiu da máquina (o PDF) e o que o servidor recusou (nota
 * repetida, CNPJ de fora, XML que não é despesa) são a MESMA notícia para quem
 * lê: dinheiro que ela acha que lançou e não lançou. Fora daqui, essa junção
 * era uma linha solta dentro do componente, e trocá-la por um dos lados só —
 * fazendo o envio engolir todas as recusas do servidor — não quebrava teste
 * nenhum. É o pior desfecho desta tela, e agora ele mora onde a mutação morde.
 *
 * Os descartados vêm na frente porque são os que a pessoa acabou de soltar na
 * tela e reconhece pelo nome.
 */
export const resultadoDoLote = (
  descartados: GrupoDeRecusa[],
  resposta: ResultadoDoLote,
): ResultadoNaTela => ({
  importadas: resposta.importadas.length,
  recusadas: [...descartados, ...agruparRecusas(resposta.recusadas)],
});

/** As duas frases do resultado do lote: a contagem em destaque e, quando há,
 *  o que ficou de fora. */
export type ResumoDoLote = { entraram: string; ficaramDeFora: string | null };

/**
 * O que a faixa de resultado diz depois do envio.
 *
 * O número de fora é a soma de TODOS os grupos, e não a quantidade de motivos:
 * "3 arquivos ficaram de fora" com dois motivos na lista embaixo é o que a
 * gerência confere contra a pasta que acabou de soltar.
 */
export const resumoDoLote = (
  importadas: number,
  recusadas: GrupoDeRecusa[],
): ResumoDoLote => {
  const totalDeFora = recusadas.reduce((soma, grupo) => soma + grupo.arquivos.length, 0);

  return {
    entraram:
      importadas === 0
        ? "Nenhuma nota entrou"
        : `${importadas} ${importadas === 1 ? "nota entrou" : "notas entraram"}`,
    ficaramDeFora:
      totalDeFora === 0
        ? null
        : `${totalDeFora} ${totalDeFora === 1 ? "arquivo ficou de fora" : "arquivos ficaram de fora"}`,
  };
};

const RECADO_PADRAO_DO_ENVIO = "Não foi possível enviar as notas. Tente de novo.";

/**
 * O recado do erro do envio, sempre em português e sempre uma frase.
 *
 * Um lote grande demais é recusado pelo servidor ANTES da nossa parte do
 * código, e o que volta é uma página de erro inteira em HTML. Ela caía crua
 * dentro da faixa vermelha: a gerência de uma padaria via um paredão de
 * `<!DOCTYPE html>` e não tinha como saber que bastava mandar menos arquivos.
 */
export const mensagemDeErroDoEnvio = (erro: unknown): string => {
  const texto = erro instanceof Error ? erro.message.trim() : "";

  if (!texto) return RECADO_PADRAO_DO_ENVIO;

  if (texto.startsWith("<") || /<!doctype|<html/i.test(texto)) {
    // Nao afirma qual foi o problema porque HTML aqui tem mais de uma causa:
    // o lote grande demais e a que a gente conhece, mas um 502 do proxy chega
    // igual. Mandar dividir o lote quando o servidor caiu faz a gerencia
    // perder tempo no caminho errado — a frase cita a causa provavel sem
    // cravar que foi ela.
    return (
      "Não foi possível enviar as notas: o servidor não respondeu como esperado. Se você mandou muitos arquivos de uma vez, tente em lotes de até 500."
    );
  }

  return texto;
};

/** Uma linha da tabela, já pronta para ser lida — sem número para formatar. */
export type LinhaDeNota = {
  id: string;
  data: string;
  /** Número e série juntos: é assim que a nota se identifica no papel. */
  documento: string;
  fornecedor: string;
  loja: string;
  valor: string;
  /** "" quando ainda não tem elemento — é o valor do `<option>` em branco. */
  elementoId: string;
  /** O nome do que já está lançado, vindo da própria nota. É o que a linha
   *  mostra quando o plano de contas não carregou. */
  elementoNome: string;
  classificada: boolean;
};

/** "2026-09-05" → "05/09/2026". Sem passar por Date: o fuso do navegador atrás
 *  de UTC devolveria o dia anterior, e a data da nota é prova. */
const emDataBrasileira = (iso: string) => iso.split("-").reverse().join("/");

export const linhasDaTabela = (notas: NotaFiscal[]): LinhaDeNota[] =>
  notas.map((nota) => ({
    id: nota.id,
    data: emDataBrasileira(nota.data_emissao),
    documento: `${nota.numero} / série ${nota.serie}`,
    fornecedor: nota.fornecedor.razao_social,
    loja: nota.loja.nome_loja,
    valor: `R$ ${emReais(Number(nota.valor_total))}`,
    elementoId: nota.elemento?.id ?? "",
    elementoNome: nota.elemento?.nome ?? "",
    classificada: nota.classificada,
  }));

// O backend pagina a listagem de notas em 50. A tela precisa do número para
// dizer QUAL faixa está na tela ("51 a 100"); os botões, esses, andam por
// `next`/`previous`, que é o que o servidor de fato respondeu.
const TAMANHO_DA_PAGINA = 50;

export type ResumoDaPagina = {
  texto: string;
  temAnterior: boolean;
  temProxima: boolean;
};

/**
 * Onde a pessoa está dentro da lista inteira.
 *
 * Sem isto a tela mostraria 50 notas de um mês que tem 300 e pareceria que só
 * existem 50 — e a despesa que faltava estava na página 4.
 */
export const resumoDaPagina = (
  pagina: PaginaDeNotas,
  paginaAtual: number,
): ResumoDaPagina => {
  const temAnterior = Boolean(pagina.previous);
  const temProxima = Boolean(pagina.next);

  // Sem texto de propósito: a própria tabela já diz que não há nota nenhuma, e
  // com mais uma linha embaixo a tela dava o mesmo recado duas vezes.
  if (pagina.count === 0 || pagina.results.length === 0) {
    return { texto: "", temAnterior, temProxima };
  }

  // "Mostrando 1 nota" / "Mostrando 12 notas": quando tudo cabe numa página,
  // dizer "1 a 12 de 12" é ruído — não há de onde a faixa ser recortada.
  if (!temAnterior && !temProxima) {
    const total = pagina.results.length;
    return {
      texto: `Mostrando ${total} ${total === 1 ? "nota" : "notas"}`,
      temAnterior,
      temProxima,
    };
  }

  const primeira = (Math.max(paginaAtual, 1) - 1) * TAMANHO_DA_PAGINA + 1;
  const ultima = Math.min(primeira + pagina.results.length - 1, pagina.count);

  return {
    texto: `Mostrando ${primeira} a ${ultima} de ${pagina.count} notas`,
    temAnterior,
    temProxima,
  };
};

/** Um grupo do plano de contas como o seletor da linha o mostra. */
export type OpcaoDeGrupo = {
  id: string;
  nome: string;
  elementos: { id: string; nome: string }[];
};

/** Marca o que a gerência tirou da lista, para ninguém achar que ainda vale.
 *  Mesma palavra da tela da empresa, onde a loja desativada aparece assim. */
const FORA_DA_LISTA = " (fora da lista)";

/**
 * O que o seletor de "gasto com" oferece numa linha.
 *
 * Só o que está ativo: classificar numa linha desativada do plano de contas é
 * lançar a despesa onde ninguém mais olha, e o relatório do mês não a mostra.
 *
 * A exceção é o que JÁ está lançado nesta nota. Some-lo da lista faria o
 * seletor cair no branco e a nota parecer sem classificação — e a primeira
 * reação seria classificá-la de novo, criando um erro que não existia. Ele
 * fica, marcado, e trocar continua sendo uma escolha.
 *
 * Grupo que fica sem nenhum elemento sai junto: um cabeçalho vazio no meio da
 * lista só faz procurar embaixo dele.
 */
export const opcoesDeClassificacao = (
  grupos: GrupoDeDespesa[],
  elementoLancado: string,
): OpcaoDeGrupo[] => {
  const opcoes: OpcaoDeGrupo[] = [];

  for (const grupo of grupos) {
    const elementos = grupo.elementos
      .filter(
        (elemento) =>
          (grupo.ativo && elemento.ativo) || elemento.id === elementoLancado,
      )
      .map((elemento) => ({
        id: elemento.id,
        nome:
          grupo.ativo && elemento.ativo
            ? elemento.nome
            : elemento.nome + FORA_DA_LISTA,
      }));

    if (elementos.length) opcoes.push({ id: grupo.id, nome: grupo.nome, elementos });
  }

  return opcoes;
};

/** Em que pé está o plano de contas quando a linha vai ser desenhada. */
export type EstadoDoPlano = "carregando" | "falhou" | "pronto";

/** Tudo que o seletor de "gasto com" precisa para se desenhar sem mentir. */
export type SeletorDaLinha = {
  /** Sem plano de contas não se troca classificação — só se apagaria a certa. */
  desabilitado: boolean;
  /** Rótulo da opção de valor "". `null` quando ela não pode existir. */
  vazio: string | null;
  /** A classificação já lançada, quando o plano não veio e ela precisa
   *  aparecer assim mesmo. */
  atual: { id: string; nome: string } | null;
  grupos: OpcaoDeGrupo[];
};

/**
 * O seletor da linha, incluindo o caso em que o plano de contas não carregou.
 *
 * Sem o plano, a lista fica só com "Ainda não escolhido" — e aí o valor da
 * nota JÁ classificada não casa com nenhuma opção, o navegador cai na primeira,
 * e a linha passa a se mostrar como não classificada. Um clique ali manda
 * `elemento: null` e apaga de verdade a classificação que estava certa.
 *
 * Por isso, enquanto o plano não está pronto: a nota classificada mostra o
 * próprio elemento (o nome vem da nota, não do plano) e NÃO oferece o branco,
 * a nota sem classificação diz o que está acontecendo, e nenhuma das duas
 * aceita troca.
 */
export const seletorDaLinha = (
  estado: EstadoDoPlano,
  plano: GrupoDeDespesa[],
  linha: { elementoId: string; elementoNome: string },
): SeletorDaLinha => {
  if (estado === "pronto") {
    return {
      desabilitado: false,
      vazio: "Ainda não escolhido",
      atual: null,
      grupos: opcoesDeClassificacao(plano, linha.elementoId),
    };
  }

  if (linha.elementoId) {
    return {
      desabilitado: true,
      vazio: null,
      atual: {
        id: linha.elementoId,
        // Nota de backend antigo, sem o nome do elemento na resposta: melhor
        // dizer que existe classificação do que mostrar um seletor em branco.
        nome: linha.elementoNome || "Já classificada",
      },
      grupos: [],
    };
  }

  return {
    desabilitado: true,
    vazio:
      estado === "falhou"
        ? "Não foi possível carregar as opções"
        : "Carregando as opções...",
    atual: null,
    grupos: [],
  };
};

/**
 * A empresa contratou o módulo de notas fiscais?
 *
 * Quem responde é o `/user/me/`, e a ausência da resposta NÃO é um "não": a
 * pergunta só está respondida quando a flag chega. Enquanto ela não chega, a
 * aba fica fora do menu — mostrar e depois sumir faria a aba piscar em toda
 * abertura do painel de quem não tem o módulo.
 */
export const contratouNotasFiscais = (usuario?: UsuarioAtual): boolean =>
  usuario?.modulos?.notas_fiscais === true;

/**
 * A aba de notas entra no menu?
 *
 * Três respostas possíveis, e a do meio é a que faltava. Enquanto o
 * `/user/me/` não volta, a aba fica fora: mostrar e sumir a faria piscar em
 * toda abertura do painel de quem não tem o módulo. Quando a resposta FALHA
 * (o caso comum é o token expirado numa aba aberta desde ontem), a aba fica:
 * sumir com ela é afirmar "a empresa não tem o módulo", que é justamente o que
 * não se sabe — e o cliente pagante ficava sem a tela, sem uma palavra, achando
 * que perdeu o que comprou. A aba é só o caminho; quem barra de verdade é o
 * servidor, e é o próprio clique que renova a sessão e traz a tela de volta.
 */
export const mostrarAbaDeNotas = (resposta: {
  usuario?: UsuarioAtual;
  carregando: boolean;
  falhou: boolean;
}): boolean => {
  if (resposta.carregando) return false;
  if (resposta.falhou) return true;

  return contratouNotasFiscais(resposta.usuario);
};

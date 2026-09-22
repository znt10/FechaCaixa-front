/**
 * O painel tem duas áreas, e elas respondem perguntas diferentes.
 *
 * "Fechamento de caixa" é o dinheiro que passou pela gaveta hoje: quanto cada
 * loja fez, o que saiu, o que falta lançar. "Despesas" é o que a empresa gasta
 * com fornecedor, que chega por nota fiscal e não tem nada a ver com o turno.
 *
 * Ficavam na mesma fila de abas, e a fila não cabia mais: no celular ela já
 * rolava com cinco destinos. Pior que o espaço era a mistura — quem entra para
 * conferir o caixa das oito lojas da manhã não está procurando nota de gás.
 */
export type Area = "CAIXA" | "DESPESAS";

export type Pagina = { href: string; rotulo: string };

const CAIXA: Pagina[] = [
  { href: "/fechamentos", rotulo: "Painel" },
  { href: "/por-loja", rotulo: "Por loja" },
  // Saidas fica AQUI, e nao em Despesas apesar do nome: ela conta para onde
  // foi o dinheiro da gaveta (retirada, gasto do turno, devolucao). E leitura
  // do fechamento, nao conta a pagar — juntar as duas faria a gerencia somar
  // dinheiro que ja saiu com nota que o fornecedor acabou de emitir.
  { href: "/saidas", rotulo: "Saídas" },
  { href: "/graficos", rotulo: "Gráficos" },
];

// So o gerente ve: quem lanca o caixa nao troca o codigo de acesso nem
// derruba aparelho. Fica no caixa por ser administracao da conta — nao
// pertence a nenhuma das duas areas, e mudar de lugar o que ja esta aprovado
// e rodando custaria mais do que vale.
const EMPRESA: Pagina = { href: "/empresa", rotulo: "Empresa" };

// Mesma razao de Empresa: quem lanca o caixa nao cadastra categoria nem item
// do catalogo. Fica ao lado dela porque e a mesma pergunta — "quem mantem o
// cadastro" — so que sobre o que a loja vende, e nao sobre quem trabalha nela.
const CATALOGO: Pagina = { href: "/catalogo", rotulo: "Catálogo" };

const DESPESAS: Pagina[] = [{ href: "/notas-fiscais", rotulo: "Notas fiscais" }];

/** As áreas do seletor, na ordem em que aparecem, e por onde cada uma começa. */
export const AREAS: { id: Area; rotulo: string; inicio: string }[] = [
  { id: "CAIXA", rotulo: "Fechamento de caixa", inicio: "/fechamentos" },
  { id: "DESPESAS", rotulo: "Despesas", inicio: "/notas-fiscais" },
];

/**
 * Em que área esta rota mora.
 *
 * Derivada da URL, e não guardada em lugar nenhum. Guardar a área escolhida
 * criaria uma segunda verdade que pode discordar do endereço aberto — e estado
 * velho sobrevivendo a uma troca é exatamente o que já fez este painel mostrar
 * a empresa errada depois de um login novo. A URL não tem como mentir.
 */
export const areaDaRota = (caminho: string): Area => {
  const deDespesas = DESPESAS.some(
    (pagina) => caminho === pagina.href || caminho.startsWith(`${pagina.href}/`),
  );
  return deDespesas ? "DESPESAS" : "CAIXA";
};

/** As abas de uma área, já filtradas pelo cargo e pelo que a empresa contratou. */
export const paginasDaArea = (
  area: Area,
  {
    gerente,
    notas,
    // Ausente conta como ligado, como em toda a configuração do formulário:
    // esconder a aba por engano tira a tela de quem depende dela, e mostrá-la
    // a mais custa uma aba que não faz nada.
    catalogo = true,
  }: { gerente: boolean; notas: boolean; catalogo?: boolean },
): Pagina[] => {
  if (area === "DESPESAS") return notas ? DESPESAS : [];
  if (!gerente) return [...CAIXA];
  // Catálogo sai da fila quando a empresa não vende nada de catálogo: ali não
  // haveria o que cadastrar. Empresa fica — administrar quem trabalha na loja
  // não tem nada a ver com o que ela vende.
  return catalogo ? [...CAIXA, EMPRESA, CATALOGO] : [...CAIXA, EMPRESA];
};

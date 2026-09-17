import { apiV1 } from "@/shared/services/api";

// A empresa administrando a si mesma. Ate agora isso so existia no /admin/ do
// Django, que e do dono da plataforma: trocar o codigo de acesso e cadastrar
// quem retira dinheiro exigiam login de plataforma. A conta vem sempre do
// login — nenhuma destas chamadas aceita "de qual empresa", justamente para
// administrar a propria nao virar caminho para administrar a do vizinho.

export type MinhaEmpresa = {
  id: string;
  nome: string;
  slug: string;
  codigo_acesso: string;
  fechamentos_por_dia: 1 | 2;
};

export type ResponsavelDeRetirada = {
  id: string;
  nome: string;
  ativo: boolean;
};

export const getMinhaEmpresa = async (): Promise<MinhaEmpresa> => {
  const res = await apiV1("/minha-empresa/");
  return res.json();
};

export const patchMinhaEmpresa = async (
  campos: Partial<Pick<MinhaEmpresa, "fechamentos_por_dia">>,
): Promise<MinhaEmpresa> => {
  const res = await apiV1("/minha-empresa/", {
    method: "PATCH",
    body: JSON.stringify(campos),
  });
  return res.json();
};

/** Troca o codigo e derruba todos os aparelhos — os dois juntos, sempre. */
export const gerarNovoCodigo = async (): Promise<MinhaEmpresa> => {
  const res = await apiV1("/minha-empresa/novo-codigo/", { method: "POST" });
  return res.json();
};

export const getResponsaveis = async (): Promise<ResponsavelDeRetirada[]> => {
  const res = await apiV1("/responsaveis-retirada/");
  const dados = await res.json();
  return dados.results ?? dados;
};

export const criarResponsavel = async (nome: string): Promise<ResponsavelDeRetirada> => {
  const res = await apiV1("/responsaveis-retirada/", {
    method: "POST",
    body: JSON.stringify({ nome }),
  });
  return res.json();
};

/** Desativa em vez de apagar: o nome dele esta carimbado nas retiradas ja
 *  lancadas, e apagar deixaria o historico dizendo "retirado por ninguem". */
export const desativarResponsavel = async (id: string): Promise<void> => {
  await apiV1(`/responsaveis-retirada/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ ativo: false }),
  });
};

/**
 * Quem toca a loja. Nao tem login — nao confundir com o Ajudante logo abaixo,
 * que e o cargo de acesso ao painel.
 *
 * Uma lista so, com duas marcas, porque os dois papeis se cruzam: o gerente
 * fecha o caixa e tambem come. Duas listas separadas obrigariam a cadastrar a
 * mesma pessoa duas vezes, e o consumo dela do mes viria partido em duas.
 */
export type Encarregado = {
  id: string;
  nome: string;
  /** Gerente: aparece no formulario em "quem esta lancando". */
  pode_lancar_caixa: boolean;
  /** Aparece na lista de consumo do formulario. */
  pode_consumir: boolean;
  ativo: boolean;
};

export const getEncarregados = async (): Promise<Encarregado[]> => {
  const res = await apiV1("/encarregados/");
  const dados = await res.json();
  return dados.results ?? dados;
};

/** Renomear. Nome sai errado — apelido, dedo trocado — e ele aparece no
 *  formulario de toda loja. Os lancamentos ja feitos nao mudam: eles guardam
 *  uma copia do nome de quando foram lancados. */
export const editarEncarregado = async ({
  id,
  ...campos
}: {
  id: string;
  nome?: string;
  pode_lancar_caixa?: boolean;
  pode_consumir?: boolean;
}): Promise<Encarregado> => {
  const res = await apiV1(`/encarregados/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(campos),
  });
  return res.json();
};

export const reativarEncarregado = async (id: string): Promise<void> => {
  await apiV1(`/encarregados/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ ativo: true }),
  });
};

export const criarEncarregado = async ({
  nome,
  pode_lancar_caixa,
}: {
  nome: string;
  /** Cadastrar pela secao de gerentes ja marca; pela de funcionarios, nao.
   *  Sao ~20 gerentes para 60 pessoas, e marcar 40 negativas a mao seria
   *  trabalho de errar. */
  pode_lancar_caixa: boolean;
}): Promise<Encarregado> => {
  const res = await apiV1("/encarregados/", {
    method: "POST",
    body: JSON.stringify({ nome, pode_lancar_caixa }),
  });
  return res.json();
};

/** Desativa em vez de apagar: o nome dela esta carimbado nos lancamentos que
 *  ja saiu, e apagar deixaria o historico dizendo "lancado por ninguem". */
export const desativarEncarregado = async (id: string): Promise<void> => {
  await apiV1(`/encarregados/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ ativo: false }),
  });
};

export type Funcionario = {
  id: number;
  nome: string;
  email: string;
  ativo: boolean;
};

export type NovoFuncionario = {
  nome: string;
  email: string;
  senha: string;
};

export const getFuncionarios = async (): Promise<Funcionario[]> => {
  const res = await apiV1("/funcionarios/");
  return res.json();
};

/** Cria o login de conferencia — sempre na empresa de quem esta criando.
 *
 *  A empresa nao vai no corpo de proposito: o servidor a tira do login. Mandar
 *  "de qual empresa" daqui seria abrir a porta que a tela inteira existe para
 *  manter fechada. */
export const criarFuncionario = async ({ nome, email, senha }: NovoFuncionario) => {
  const res = await apiV1("/funcionarios/", {
    method: "POST",
    body: JSON.stringify({ first_name: nome, email, password: senha }),
  });
  return res.json();
};

/** Tira do ar sem apagar: o nome dele continua nos turnos que ja conferiu. */
export const definirAtivoDoFuncionario = async ({
  id,
  ativo,
}: {
  id: number;
  ativo: boolean;
}): Promise<Funcionario> => {
  const res = await apiV1(`/funcionarios/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ ativo }),
  });
  return res.json();
};

/** Apaga de vez. O caixa que ele conferiu sobrevive; o nome de quem conferiu
 *  e que se perde — por isso a tela pede confirmacao. */
export const apagarFuncionario = async (id: number): Promise<void> => {
  await apiV1(`/funcionarios/${id}/`, { method: "DELETE" });
};

export type LojaDaEmpresa = {
  id: string;
  nome_loja: string;
  cidade: string;
  endereco: string;
  ativo: boolean;
  /** Catorze digitos crus, ou null enquanto ninguem cadastrou. E por ele que a
   *  nota fiscal acha a loja: o XML traz o CNPJ do destinatario, e o servidor
   *  procura a loja com aquele CNPJ. Loja sem ele nao recebe nota nenhuma. */
  cnpj: string | null;
};

export type NovaLoja = {
  nome: string;
  cidade: string;
  endereco: string;
  /** Opcional: a loja funciona sem ele, so nao recebe nota fiscal. Vai
   *  pontuado mesmo — o servidor normaliza. */
  cnpj?: string;
};

/** As lojas da empresa, ativas e inativas — a tela mostra as duas. O painel
 *  usa outro caminho, que filtra so as ativas. */
export const getLojasDaEmpresa = async (): Promise<LojaDaEmpresa[]> => {
  const res = await apiV1("/lojas/");
  const dados = await res.json();
  return dados.results ?? dados;
};

/** A conta sai do login, e o servidor ainda coloca quem criou como gerente da
 *  loja — sem isso a gerente perderia a escrita na loja que acabou de criar.
 *
 *  E-mail nao entra aqui de proposito: no FechaCaixa a loja nao faz login, ela
 *  entra pelo codigo de acesso no aparelho. Preencher e-mail cria um login de
 *  loja (heranca do Unistock) e dispara um convite por e-mail — efeito que
 *  ninguem pediu ao cadastrar uma loja. */
export const criarLoja = async ({ nome, cidade, endereco, cnpj }: NovaLoja) => {
  const res = await apiV1("/lojas/", {
    method: "POST",
    // `null` e nao string vazia: no serializer os dois passam, mas null e o
    // que o campo guarda de fato quando esta sem CNPJ, e e o que a proxima
    // leitura vai devolver. Mandar "" faria a tela e o banco discordarem
    // sobre o que significa "vazio".
    body: JSON.stringify({ nome_loja: nome, cidade, endereco, cnpj: cnpj || null }),
  });
  return res.json();
};

/** Corrigir o cadastro: nome, cidade ou endereco.
 *
 *  O nome da loja aparece no painel, no formulario e em todo lancamento ja
 *  feito. Sem editar, consertar um erro de digitacao exigiria criar outra loja
 *  e desativar a antiga — e o historico ficaria partido em duas. */
export const editarLoja = async ({
  id,
  nome,
  cidade,
  endereco,
  cnpj,
}: NovaLoja & { id: string }): Promise<LojaDaEmpresa> => {
  const res = await apiV1(`/lojas/${id}/`, {
    method: "PATCH",
    // Apagar o campo e um jeito legitimo de dizer "esse CNPJ estava errado",
    // entao o vazio vai como null e limpa o que estava la — em vez de o PATCH
    // omitir o campo e deixar o valor errado gravado.
    body: JSON.stringify({ nome_loja: nome, cidade, endereco, cnpj: cnpj || null }),
  });
  return res.json();
};

/** Desativar tira a loja do painel e do formulario sem apagar o historico
 *  dela. Apagar loja nao existe nesta tela: levaria junto todo o caixa
 *  lancado por ela. */
export const definirAtivoDaLoja = async ({
  id,
  ativo,
}: {
  id: string;
  ativo: boolean;
}): Promise<LojaDaEmpresa> => {
  const res = await apiV1(`/lojas/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ ativo }),
  });
  return res.json();
};

/** Apagar loja e o segundo passo — o servidor recusa uma loja ativa, e recusa
 *  tambem uma que tenha caixa lancado (FechamentoCaixa.loja e CASCADE: o caixa
 *  iria junto). A mensagem da recusa e o que a tela mostra. */
export const apagarLoja = async (id: string): Promise<void> => {
  await apiV1(`/lojas/${id}/`, { method: "DELETE" });
};

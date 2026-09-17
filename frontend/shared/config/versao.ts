/**
 * Qual build o aparelho esta rodando — e como saber que ele ficou para tras.
 *
 * O celular da loja fica dias com o app aberto. Como o service worker nao
 * guarda nada (ver public/sw.js), quem fecha e abre o app ja pega a versao
 * nova; quem nunca fecha continua rodando o JavaScript do build antigo. E o
 * `next start` sobe um container novo a cada deploy, entao os pedacos do
 * bundle velho deixam de existir no servidor: a primeira tela que precisar de
 * um pedaco ainda nao baixado quebra sem explicar por que.
 *
 * Dai a comparacao: o valor abaixo e congelado no `npm run build` e viaja
 * dentro do bundle; /api/versao devolve o valor do build que esta no ar agora.
 * Diferentes quer dizer que houve deploy desde que esta tela abriu.
 */
export const VERSAO_DO_APP = process.env.NEXT_PUBLIC_VERSAO_DO_APP ?? "dev";

/** Em desenvolvimento nao existe deploy — o proprio dev server recarrega. */
export const VERSAO_DE_DESENVOLVIMENTO = "dev";

/**
 * Houve deploy desde que esta tela abriu?
 *
 * Conservadora de proposito: qualquer coisa fora do padrao responde `false`.
 * Um falso negativo custa uma atualizacao adiada ate a proxima checagem; um
 * falso positivo poe uma faixa "atualize" na frente de quem esta lancando o
 * caixa, por causa de um fetch que falhou.
 */
export const precisaAtualizar = (
  versaoLocal: string | undefined,
  versaoDoServidor: string | undefined,
): boolean => {
  if (!versaoLocal || !versaoDoServidor) return false;
  if (versaoLocal === VERSAO_DE_DESENVOLVIMENTO) return false;

  return versaoLocal !== versaoDoServidor;
};

/**
 * O CNPJ da loja, do jeito que a gerente le e do jeito que o servidor guarda.
 *
 * O backend normaliza sozinho o que chegar (`Loja.normalizar_cnpj` joga fora
 * tudo que nao e digito), entao a mascara nao existe para ele. Ela existe para
 * a conferencia: o CNPJ vem do contrato ou do cartao do CNPJ, sempre pontuado,
 * e comparar catorze digitos corridos com a fonte a olho e onde se troca um
 * digito sem perceber. Uma nota fiscal amarrada na loja errada e o preco desse
 * erro, e ele nao aparece na hora — aparece no relatorio do mes.
 */

/** So os digitos, no maximo catorze. E o que o backend guarda e o que a nota
 *  fiscal traz no XML, entao e por aqui que os dois se encontram. */
export const somenteDigitos = (bruto: string) =>
  bruto.replace(/\D/g, "").slice(0, 14);

/**
 * Pontua o que ja foi digitado, e so o que ja foi digitado.
 *
 * O separador entra junto com o digito que vem depois dele, nunca antes: uma
 * mascara que devolvesse "15." com dois digitos travaria o campo, porque o
 * backspace apagaria o ponto e a mascara o poria de volta na mesma tecla.
 */
export const mascararCnpj = (bruto: string) => {
  const digitos = somenteDigitos(bruto);

  let pontuado = digitos.slice(0, 2);
  if (digitos.length > 2) pontuado += `.${digitos.slice(2, 5)}`;
  if (digitos.length > 5) pontuado += `.${digitos.slice(5, 8)}`;
  if (digitos.length > 8) pontuado += `/${digitos.slice(8, 12)}`;
  if (digitos.length > 12) pontuado += `-${digitos.slice(12, 14)}`;
  return pontuado;
};

/**
 * Os catorze digitos estao todos la.
 *
 * Vazio devolve `false` e isso nao e "invalido": o campo e opcional, e quem
 * decide o que fazer com o vazio e a tela — ela nao manda o campo, em vez de
 * mandar um CNPJ pela metade que o servidor recusaria.
 */
export const cnpjCompleto = (valor: string) => somenteDigitos(valor).length === 14;

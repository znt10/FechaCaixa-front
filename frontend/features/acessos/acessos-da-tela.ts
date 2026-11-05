import type { EmailEnviado, NovoGerente, SituacaoDoGerente } from "./services/acessos";

const SITUACOES: Record<SituacaoDoGerente, string> = {
  ATIVO: "Ativo",
  AGUARDANDO_SENHA: "Aguardando senha",
  DESATIVADO: "Desativado",
};

export const rotuloDaSituacao = (situacao: SituacaoDoGerente) => SITUACOES[situacao];

/** O que aconteceu depois de criar o gerente, dito em uma frase. */
export const avisoDoGerente = (email: string, emailEnviado: EmailEnviado) =>
  emailEnviado === null
    ? "Gerente criado com a senha informada."
    : emailEnviado
      ? `Gerente criado. Link enviado para ${email}.`
      : "Gerente criado, mas o e-mail não saiu. Use Reenviar link.";

/** Senha em branco (ou só espaços) não vai: é o pedido do link por e-mail. */
export const corpoDoGerente = ({
  nome,
  email,
  senha,
}: {
  nome: string;
  email: string;
  senha: string;
}): NovoGerente => ({
  nome: nome.trim(),
  email: email.trim(),
  ...(senha.trim() ? { senha } : {}),
});

/** A dica do campo de senha. */
export const DICA_DA_SENHA =
  "Deixe em branco para mandar por e-mail um link para a pessoa criar a própria senha.";

/** Envia e só limpa o formulário se deu certo. Com erro (e-mail em uso, por
 *  exemplo) o que foi digitado fica, e a mensagem aparece pela mutação. */
export const enviarGerente = async (
  campos: { nome: string; email: string; senha: string },
  onEnviar: (gerente: NovoGerente) => Promise<unknown>,
  limpar: () => void,
) => {
  try {
    await onEnviar(corpoDoGerente(campos));
  } catch {
    return;
  }
  limpar();
};

import { apiFetch, apiV1 } from './api';
import { useAuthStore } from '@/shared/stores/authStore';

// Os cookies de autenticacao (access_token, refresh_token, role) sao
// gravados e removidos exclusivamente pelo backend, como HTTP-only.
// Nenhum token passa pelo JavaScript.

// 🔹 LOGIN


/**
 * Quem esta logado, direto do servidor.
 *
 * `modulos` diz o que a EMPRESA contratou, e nao o que o cargo pode: sao duas
 * perguntas diferentes, e a interface precisa das duas para decidir se desenha
 * a aba. Vem opcional porque a resposta de um backend mais antigo nao a traz —
 * e, nesse caso, modulo nenhum e oferecido, que e o lado seguro do engano.
 */
export type UsuarioAtual = {
  id: number;
  first_name?: string;
  email?: string;
  group?: string;
  modulos?: { notas_fiscais?: boolean };
};

export const getMe = async (): Promise<UsuarioAtual> => {
  const response = await apiV1('/user/me/', {
    method: 'GET',
  });
  return response.json();
};

export const login = async (email: string, password: string) => {
  const response = await apiFetch('/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  const userInfo = data.user;

  const user = {
    id: userInfo.id,
    email: userInfo.email,
    first_name: userInfo.first_name,
    group: userInfo.group,
    loja_id: userInfo.loja?.id ?? null,
    loja_nome: userInfo.loja?.nome ?? null,
  };

  useAuthStore.getState().setUser(user);

  return user;
};


// 🔹 LOGOUT
export const logout = async () => {
  useAuthStore.getState().clearUser();

  // A remocao dos cookies HTTP-only e feita pelo backend nesta chamada.
  try {
    const response = await apiFetch('/logout/', {
      method: 'POST',
    });

    return response;
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
  }
};


// Token vindo da URL (useParams) para dentro do path da API.
//
// O useParams do Next devolve o segmento JA percent-encoded: os ":" que o
// django.core.signing usa como separador chegam como "%3A". Chamar
// encodeURIComponent direto nisso gera "%253A", o Django decodifica uma vez so
// e recebe um token quebrado — que ele rejeita com "Link invalido ou ja
// utilizado", mensagem que nao tem nada a ver com a causa.
//
// Decodificar antes normaliza os dois casos. E idempotente: o alfabeto do token
// (base64url + ":") nao tem "%", entao decodificar um token cru nao muda nada.
const tokenParaUrl = (token: string) =>
  encodeURIComponent(decodeURIComponent(token));


// 🔹 CONFIRMACAO DE CONTA (link enviado por email)
export const confirmarConta = async (token: string) => {
  const response = await apiV1(`/user/confirmar/${tokenParaUrl(token)}/`, {
    method: 'GET',
  });

  return (await response.json()) as { detail?: string };
};


// 🔹 SENHA (definicao no 1o acesso e recuperacao de senha)
// A loja define a senha no 1o acesso (link enviado pro email da loja) e usa o
// mesmo fluxo quando esquece a senha. apiV1/apiFetch ja injeta o Content-Type
// e ja lanca um Error com a mensagem do backend quando a resposta nao e ok,
// entao nao ha necessidade de checar response.ok aqui (mesmo padrao do
// confirmarConta acima).
export const definirSenha = async (token: string, password: string) => {
  const response = await apiV1(
    `/user/definir-senha/${tokenParaUrl(token)}/`,
    {
      method: 'POST',
      body: JSON.stringify({ password }),
    },
  );

  return (await response.json().catch(() => ({}))) as { detail?: string };
};

export const esqueciSenha = async (email: string) => {
  const response = await apiV1('/user/esqueci-senha/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

  return (await response.json().catch(() => ({}))) as { detail?: string };
};

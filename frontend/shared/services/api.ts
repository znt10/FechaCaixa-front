// Todas as chamadas passam pelo rewrite same-origin do Next (/backend/...),
// entao os cookies HTTP-only de autenticacao sao enviados automaticamente
// pelo navegador. Nenhum token e lido ou gravado via JavaScript.
const API_URL = "/backend";

const NO_REFRESH_ENDPOINTS = [
  "/login/",
  "/logout/",
  "/token/refresh/",
  "/api/v1/user/me/",
];

const extractApiErrorMessage = (data: unknown): string | null => {
  if (!data) return null;
  if (typeof data === "string") return data;

  if (Array.isArray(data)) {
    return data.map(extractApiErrorMessage).filter(Boolean).join(" ");
  }

  if (typeof data === "object") {
    const record = data as Record<string, unknown>;
    const directMessage = record.error || record.detail;

    if (typeof directMessage === "string") {
      return directMessage;
    }

    return Object.entries(record)
      .map(([key, value]) => {
        const message = extractApiErrorMessage(value);
        return message ? `${key}: ${message}` : null;
      })
      .filter(Boolean)
      .join(" ");
  }

  return null;
};

export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {},
  _isRetry = false,
): Promise<Response> => {
  const { headers, ...rest } = options;
  const canRefresh = !NO_REFRESH_ENDPOINTS.includes(endpoint);
  const requestHeaders = new Headers(headers);

  // FormData carrega o proprio boundary no cabecalho, e so o navegador sabe
  // qual e. Carimbar application/json aqui faz o Django receber um corpo que
  // nao sabe ler — o upload de XML volta 400 sem dizer o motivo.
  const corpoEhFormData =
    typeof FormData !== "undefined" && rest.body instanceof FormData;

  if (!requestHeaders.has("Content-Type") && !corpoEhFormData) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...rest,
    credentials: "include",
    headers: requestHeaders,
  });

  // So 401. Um 403 quer dizer "autenticado, mas nao pode" — renovar o token
  // devolve exatamente o mesmo 403, e o catch abaixo manda para /login: com o
  // cookie ainda valido, o middleware devolve a pessoa para a tela de origem, e
  // os dois ficam se empurrando para sempre.
  //
  // O 403 estava nesta lista por um motivo que deixou de existir: o DRF
  // respondia 403 a requisicao sem autenticacao nenhuma, porque nenhum
  // authenticator informava o cabecalho WWW-Authenticate. Desde que
  // CookieJWTAuthentication ganhou authenticate_header, falta de credencial
  // volta como 401 — que e o caso que o refresh existe para resolver.
  if (canRefresh && response.status === 401 && !_isRetry) {
    try {
      // O refresh_token HTTP-only vai junto automaticamente; o backend
      // devolve o novo access_token tambem como cookie HTTP-only.
      const refreshResponse = await fetch(`${API_URL}/token/refresh/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!refreshResponse.ok) {
        throw new Error("Sessao expirada. Faca login novamente.");
      }

      return await apiFetch(endpoint, options, true);
    } catch (refreshError) {
      console.error("Erro no refresh:", refreshError);

      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }

      throw refreshError;
    }
  }

  if (!response.ok) {
    let message = `Erro ${response.status}`;

    try {
      const data = await response.clone().json();
      message = extractApiErrorMessage(data) || message;
    } catch {
      const errorText = await response.clone().text();
      message = errorText || message;
    }

    throw new Error(message);
  }

  return response;
};

export const apiV1 = (endpoint: string, options?: RequestInit) => {
  return apiFetch(`/api/v1${endpoint}`, options);
};

/**
 * Chamada de endpoint publico (formulario do funcionario, sem login).
 *
 * Nao passa pelo apiFetch de proposito: la um 401/403 significa "sessao
 * expirada" e leva pro /login. Aqui nao ha sessao nenhuma para expirar — o
 * funcionario seria jogado numa tela de login que ele nao tem como passar,
 * no meio do lancamento. Os mesmos caminhos (/lojas/, /responsaveis-retirada/)
 * atendem os dois mundos, entao a diferenca precisa estar em quem chama.
 */
export const apiV1Publico = async (
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> => {
  const { headers, ...rest } = options;
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}/api/v1${endpoint}`, {
    ...rest,
    headers: requestHeaders,
  });

  if (!response.ok) {
    let message = `Erro ${response.status}`;
    try {
      message = extractApiErrorMessage(await response.clone().json()) || message;
    } catch {
      message = (await response.clone().text()) || message;
    }
    throw new Error(message);
  }

  return response;
};

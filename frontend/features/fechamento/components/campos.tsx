"use client";

import React from "react";

// Blocos visuais do formulario de fechamento (Figma "1 · Formulário —
// Funcionário"). Vivem aqui, e nao em shared/, porque a paleta caixa-* e so
// desta tela publica — o painel logado usa os tokens theme-*.

const CLASSE_ROTULO =
  "text-[12px] font-medium leading-[1.4] tracking-[0.24px] text-caixa-muted";

const CLASSE_CAIXA =
  "w-full rounded-[10px] border border-caixa-border bg-caixa-surface p-[14px] text-[16px] leading-[1.4] text-caixa-ink outline-none transition focus:border-caixa-accent focus:ring-2 focus:ring-caixa-accent/15";

export function Campo({
  rotulo,
  htmlFor,
  children,
}: {
  rotulo: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-[7px]">
      <label htmlFor={htmlFor} className={CLASSE_ROTULO}>
        {rotulo}
      </label>
      {children}
    </div>
  );
}

export function TituloSecao({ children }: { children: React.ReactNode }) {
  return (
    <p className="w-full text-[12px] font-semibold leading-[1.4] tracking-[0.48px] text-caixa-muted">
      {children}
    </p>
  );
}

export function CampoTexto({
  id,
  valor,
  onChange,
  placeholder,
  ...resto
}: {
  id: string;
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id">) {
  return (
    <input
      id={id}
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${CLASSE_CAIXA} placeholder:text-caixa-muted`}
      {...resto}
    />
  );
}

export function CampoSelecao({
  id,
  valor,
  onChange,
  children,
}: {
  id: string;
  valor: string;
  onChange: (valor: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full">
      <select
        id={id}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className={`${CLASSE_CAIXA} appearance-none pr-[40px] font-medium`}
      >
        {children}
      </select>
      {/* Seta exportada do Figma (poligono cheio, nao o chevron do heroicons):
          caixa externa 11x7, folha 9.53x5.25 no topo, girada 180°. Vai inline
          porque arquivo em public/ passa pelo proxy.ts e volta 307 pro /login. */}
      <span className="pointer-events-none absolute right-[14px] top-1/2 flex h-[7px] w-[11px] -translate-y-1/2 rotate-180 items-start justify-center">
        <svg
          width="9.52628"
          height="5.25"
          viewBox="0 0 9.52628 5.25"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="block h-[5.25px] w-[9.526px]"
        >
          <path d="M4.76314 0L9.52628 5.25H0L4.76314 0Z" fill="#6E6A62" />
        </svg>
      </span>
    </div>
  );
}

/**
 * Digita e escolhe: o campo filtra a lista enquanto a pessoa escreve.
 *
 * Um <select> com muitos nomes no celular obriga a rolar uma roda ate achar o
 * seu; digitando, duas letras ja chegam la. E `datalist` nativo de proposito —
 * um combobox escrito a mao teria que reimplementar teclado, foco e leitura de
 * tela, e o teclado do celular ja sabe lidar com este.
 *
 * O que sai daqui e sempre o TEXTO digitado. Quem chama resolve o id pelo
 * nome (ver `acharPeloNome`), porque o valor precisa ser uma pessoa do
 * cadastro — foi para acabar com "Marina", "marina" e "Mari" que o cadastro
 * existe.
 */
export function CampoComLista({
  id,
  valor,
  onChange,
  opcoes,
  placeholder,
}: {
  id: string;
  valor: string;
  onChange: (valor: string) => void;
  opcoes: string[];
  placeholder?: string;
}) {
  const idDaLista = `${id}-opcoes`;

  return (
    <>
      <input
        id={id}
        list={idDaLista}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={`${CLASSE_CAIXA} placeholder:text-caixa-muted`}
      />
      <datalist id={idDaLista}>
        {opcoes.map((opcao) => (
          <option key={opcao} value={opcao} />
        ))}
      </datalist>
    </>
  );
}

/**
 * Acha a pessoa pelo que foi digitado, ignorando caixa, acento e espaco.
 *
 * "jose", "José " e "JOSE" sao a mesma pessoa do cadastro — exigir a grafia
 * exata devolveria ao formulario o erro que ele acabou de perder.
 */
export const acharPeloNome = <T extends { id: string; nome: string }>(
  opcoes: T[],
  digitado: string,
): T | undefined => {
  const chave = normalizar(digitado);
  if (!chave) return undefined;
  return opcoes.find((opcao) => normalizar(opcao.nome) === chave);
};

const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

/**
 * Campo de dinheiro: o funcionario digita so digitos e o campo formata em
 * reais enquanto ele digita. Guardar centavos como string de digitos evita o
 * ponto/virgula errado no celular — teclado numerico nao tem virgula garantida.
 */
export function CampoMoeda({
  id,
  digitos,
  onChange,
}: {
  id: string;
  digitos: string;
  onChange: (digitos: string) => void;
}) {
  return (
    <div className="flex w-full items-center justify-between rounded-[10px] border border-caixa-border bg-caixa-surface p-[14px] text-[16px] leading-[1.4] focus-within:border-caixa-accent focus-within:ring-2 focus-within:ring-caixa-accent/15">
      <span className="text-caixa-muted">R$</span>
      <input
        id={id}
        inputMode="numeric"
        value={formatarMoeda(digitos)}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
        className="min-w-0 flex-1 bg-transparent text-right font-medium text-caixa-ink outline-none"
      />
    </div>
  );
}

export function Pergunta({
  rotulo,
  valor,
  onChange,
  children,
}: {
  rotulo: string;
  valor: boolean;
  onChange: (valor: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-[10px]">
      <div className="flex w-full items-center justify-between gap-3">
        <span className="text-[15px] leading-[1.4] text-caixa-ink">{rotulo}</span>
        <div className="flex shrink-0 gap-[6px]">
          {[
            { texto: "Não", opcao: false },
            { texto: "Sim", opcao: true },
          ].map(({ texto, opcao }) => (
            <button
              key={texto}
              type="button"
              aria-pressed={valor === opcao}
              onClick={() => onChange(opcao)}
              className={`rounded-[8px] border px-[14px] py-[7px] text-[14px] font-medium transition ${
                valor === opcao
                  ? "border-caixa-accent bg-caixa-accent-soft text-caixa-accent"
                  : "border-caixa-border bg-caixa-surface text-caixa-muted"
              }`}
            >
              {texto}
            </button>
          ))}
        </div>
      </div>
      {valor && children ? (
        <div className="flex w-full flex-col gap-[14px] rounded-[10px] bg-caixa-bg p-[14px]">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export const formatarMoeda = (digitos: string) =>
  (Number(digitos || "0") / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Digitos de centavos -> string decimal que o DecimalField do DRF aceita. */
export const digitosParaDecimal = (digitos: string) =>
  (Number(digitos || "0") / 100).toFixed(2);

/** O contrario: "500.00" (o backend fala em reais) vira "50000" (os campos
 *  guardam centavos). Zero volta vazio, para o campo ficar igual ao de um
 *  formulario novo em vez de mostrar um "0,00" que ninguem digitou. */
export const decimalParaDigitos = (valor: string | null) => {
  const centavos = Math.round(Number(valor ?? 0) * 100);
  return centavos > 0 ? String(centavos) : "";
};

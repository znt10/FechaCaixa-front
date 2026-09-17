/**
 * A marca do FechaCaixa: a gaveta do caixa.
 *
 * E o mesmo desenho de tres lugares — o icone da aba (app/icon.svg), o icone
 * do app instalado no celular (public/icones/) e esta tela. Um desenho so,
 * para quem instala o app na loja reconhecer o mesmo simbolo no login.
 *
 * Este arquivo era o LogoIcon: um cubo em wireframe, de caixa de papelao, que
 * veio do Unistock — onde o assunto era estoque. Ficou orfao quando o Unistock
 * saiu, e o cubo continuou aparecendo no login, em azul.
 *
 * O fundo arredondado faz parte do simbolo (nao e um wrapper): e assim que ele
 * aparece na tela inicial do celular.
 */
export function MarcaFechaCaixa({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      role="img"
      aria-label="FechaCaixa"
      className={className}
    >
      <rect width="512" height="512" rx="112" fill="#14624a" />
      <rect x="86" y="128" width="340" height="250" rx="28" fill="#ffffff" />
      <rect x="86" y="186" width="340" height="12" fill="#14624a" />
      <rect x="172" y="280" width="168" height="28" rx="14" fill="#14624a" />
    </svg>
  );
}

export default MarcaFechaCaixa;

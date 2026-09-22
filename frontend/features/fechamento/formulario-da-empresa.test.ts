import { describe, expect, it } from "vitest";

import {
  avisoDeCatalogoVazio,
  resumoDoFormulario,
  usaCatalogo,
  nomeDosItens,
  perguntaDePerda,
  perguntasVisiveis,
  tituloDoCatalogo,
} from "./formulario-da-empresa";

const nenhumaRespondida = {
  retirada: false,
  despesa: false,
  devolucao: false,
  consumo: false,
  perda: false,
};

describe("perguntasVisiveis", () => {
  it("mostra as perguntas que a empresa deixou ligadas", () => {
    const visiveis = perguntasVisiveis(
      {
        pergunta_retirada: true,
        pergunta_despesa: false,
        pergunta_devolucao: true,
        pergunta_consumo: false,
        catalogo_ativo: false,
      },
      nenhumaRespondida,
    );

    expect(visiveis).toEqual({
      retirada: true,
      despesa: false,
      devolucao: true,
      consumo: false,
      perda: false,
    });
  });

  it("a perda de item acompanha o catálogo", () => {
    expect(perguntasVisiveis({ catalogo_ativo: true }, nenhumaRespondida).perda).toBe(true);
    expect(perguntasVisiveis({ catalogo_ativo: false }, nenhumaRespondida).perda).toBe(false);
  });

  it("sem a configuração na resposta, tudo aparece", () => {
    // O front novo pode subir antes do backend que manda os campos. Ausente
    // tem que ser "ligada": sumir com todas as perguntas por causa da ordem
    // do deploy seria a loja fechando o caixa sem poder lançar retirada.
    expect(perguntasVisiveis({}, nenhumaRespondida)).toEqual({
      retirada: true,
      despesa: true,
      devolucao: true,
      consumo: true,
      perda: true,
    });
  });

  it("pergunta desligada continua na tela quando o turno em correção já tem dado nela", () => {
    // Corrigir um turno antigo manda o formulário inteiro de volta. Se o
    // consumo sumisse da tela, o envio iria sem ele e o servidor entenderia
    // "não teve consumo" — apagando o que a loja lançou antes da empresa
    // desligar a pergunta.
    const visiveis = perguntasVisiveis(
      { pergunta_consumo: false, catalogo_ativo: false },
      { ...nenhumaRespondida, consumo: true, perda: true },
    );

    expect(visiveis.consumo).toBe(true);
    expect(visiveis.perda).toBe(true);
  });
});

describe("textos com o nome dos itens", () => {
  it("usa o nome que a empresa deu", () => {
    const padaria = { nome_dos_itens: "pães" };

    expect(perguntaDePerda(padaria)).toBe("Houve perda de pães?");
    expect(tituloDoCatalogo(padaria)).toBe("Catálogo de pães");
    expect(avisoDeCatalogoVazio(padaria)).toBe(
      "O catálogo de pães está vazio. Cadastre os itens na tela Catálogo.",
    );
  });

  it("sem nome, continua chamando de salgados", () => {
    // Backend antigo, ou um nome que chegou em branco: "Houve perda de ?"
    // no formulário seria pior do que o texto de antes.
    expect(nomeDosItens({})).toBe("salgados");
    expect(nomeDosItens({ nome_dos_itens: "   " })).toBe("salgados");
    expect(perguntaDePerda({})).toBe("Houve perda de salgados?");
  });

  it("tira o espaço em volta do nome", () => {
    expect(perguntaDePerda({ nome_dos_itens: " tortas " })).toBe("Houve perda de tortas?");
  });
});

describe("usaCatalogo", () => {
  const usuario = (catalogo?: boolean) => ({ modulos: { catalogo } });

  it("liga quando a empresa usa catálogo", () => {
    expect(usaCatalogo({ usuario: usuario(true), carregando: false, falhou: false })).toBe(true);
  });

  it("desliga quando a empresa não usa", () => {
    expect(usaCatalogo({ usuario: usuario(false), carregando: false, falhou: false })).toBe(false);
  });

  it("enquanto carrega, fica fora", () => {
    // Mostrar e sumir faria a aba piscar em toda abertura do painel de quem
    // não usa catálogo.
    expect(usaCatalogo({ usuario: undefined, carregando: true, falhou: false })).toBe(false);
  });

  it("quando a resposta falha, fica", () => {
    // O caso comum é o token vencido numa aba aberta desde ontem. Sumir aí é
    // afirmar "esta empresa não usa catálogo", que é justo o que não se sabe
    // — e tirava a tela de quem depende dela.
    expect(usaCatalogo({ usuario: undefined, carregando: false, falhou: true })).toBe(true);
  });

  it("backend antigo, sem o campo, continua com catálogo", () => {
    expect(usaCatalogo({ usuario: {}, carregando: false, falhou: false })).toBe(true);
  });
});

describe("resumoDoFormulario", () => {
  it("diz quantas perguntas estão ligadas e como está o catálogo", () => {
    // É o que o cartão recolhido mostra: quem recolheu precisa saber o que
    // está valendo sem abrir de novo.
    expect(
      resumoDoFormulario({
        pergunta_retirada: true,
        pergunta_despesa: true,
        pergunta_devolucao: false,
        pergunta_consumo: false,
        catalogo_ativo: true,
        nome_dos_itens: "pães",
      }),
    ).toBe("2 de 4 perguntas · catálogo de pães");
  });

  it("uma pergunta só não vira 'perguntas'", () => {
    expect(
      resumoDoFormulario({
        pergunta_retirada: true,
        pergunta_despesa: false,
        pergunta_devolucao: false,
        pergunta_consumo: false,
        catalogo_ativo: false,
      }),
    ).toBe("1 de 4 perguntas · sem catálogo");
  });

  it("com tudo ligado, diz que são todas", () => {
    // "4 de 4" faz procurar o que falta. Não falta nada.
    expect(resumoDoFormulario({})).toBe("todas as perguntas · catálogo de salgados");
  });

  it("com tudo desligado, não esconde isso atrás de um número", () => {
    expect(
      resumoDoFormulario({
        pergunta_retirada: false,
        pergunta_despesa: false,
        pergunta_devolucao: false,
        pergunta_consumo: false,
        catalogo_ativo: false,
      }),
    ).toBe("nenhuma pergunta · sem catálogo");
  });
});

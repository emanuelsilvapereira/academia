import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gerarCsv } from "../lib/csv.ts";
import { fimDaMatricula, gerarParcelas, inicioDaRenovacao } from "../lib/financeiro.ts";
import { addMeses, formatarCpf, formatarTelefone } from "../lib/format.ts";
import { gerarPdf, larguraTexto } from "../lib/pdf.ts";
import { pode } from "../lib/permissoes.ts";

describe("matrícula e parcelas", () => {
  it("addMeses usa o último dia quando o mês não tem o dia", () => {
    assert.equal(addMeses("2026-01-31", 1), "2026-02-28");
    assert.equal(addMeses("2024-01-31", 1), "2024-02-29");
    assert.equal(addMeses("2026-11-15", 3), "2027-02-15");
  });
  it("uma matrícula de 1 mês cobre até a véspera do mesmo dia no mês seguinte", () => {
    assert.equal(fimDaMatricula("2026-03-10", 1), "2026-04-09");
    assert.equal(fimDaMatricula("2026-01-01", 12), "2026-12-31");
  });
  it("as parcelas somam exatamente o valor do plano", () => {
    const parcelas = gerarParcelas(89900, 12, "2026-01-31");
    assert.equal(parcelas.length, 12);
    assert.equal(parcelas.reduce((s, p) => s + p.valor_centavos, 0), 89900);
    assert.equal(parcelas[0].vencimento, "2026-01-31");
    assert.equal(parcelas[1].vencimento, "2026-02-28");
  });
  it("a renovação começa no dia seguinte ao fim, ou hoje se já acabou", () => {
    assert.equal(inicioDaRenovacao("2026-12-10", "2026-12-01"), "2026-12-11");
    assert.equal(inicioDaRenovacao("2026-11-01", "2026-12-01"), "2026-12-01");
    assert.equal(inicioDaRenovacao(null, "2026-12-01"), "2026-12-01");
  });
});

describe("perfis de acesso", () => {
  it("cada perfil só pode o que está na tabela", () => {
    assert.equal(pode("admin", "usuarios.gerenciar"), true);
    assert.equal(pode("recepcao", "financeiro.editar"), true);
    assert.equal(pode("recepcao", "treinos.editar"), false);
    assert.equal(pode("instrutor", "treinos.editar"), true);
    assert.equal(pode("instrutor", "financeiro.ver"), false);
    assert.equal(pode("desconhecido", "alunos.editar"), false);
  });
});

describe("formatação", () => {
  it("formata CPF e telefone guardados só com números", () => {
    assert.equal(formatarCpf("52998224725"), "529.982.247-25");
    assert.equal(formatarTelefone("11912345678"), "(11) 91234-5678");
  });
});

describe("exportação", () => {
  it("CSV usa ; com BOM, escapa aspas e neutraliza fórmulas", () => {
    const csv = gerarCsv(["Nome", "Obs"], [["Ana; Souza", 'diz "oi"'], ["=1+1", "-5"]]);
    assert.ok(csv.startsWith("﻿Nome;Obs\r\n"));
    assert.ok(csv.includes('"Ana; Souza";"diz ""oi"""'));
    assert.ok(csv.includes("'=1+1;-5"));
  });
  it("PDF tem cabeçalho, xref coerente e quebra em várias páginas", () => {
    const linhas = Array.from({ length: 120 }, (_, i) => [`Aluno ${i} com acentuação ção`, "R$ 1,00"]);
    const pdf = Buffer.from(gerarPdf({ titulo: "Teste", colunas: [{ titulo: "Nome", largura: 3 }, { titulo: "Valor", largura: 1, direita: true }], linhas }));
    const texto = pdf.toString("latin1");
    assert.ok(texto.startsWith("%PDF-1.4"));
    assert.ok(texto.trimEnd().endsWith("%%EOF"));
    const paginas = Number(/\/Count (\d+)/.exec(texto)![1]);
    assert.ok(paginas >= 3, `esperava 3+ páginas, veio ${paginas}`);
    // A posição informada em startxref aponta mesmo para a tabela xref.
    const pos = Number(/startxref\n(\d+)/.exec(texto)![1]);
    assert.equal(texto.slice(pos, pos + 4), "xref");
    // "ç" vira o byte 0xE7 (WinAnsi), não UTF-8.
    assert.ok(pdf.includes(0xe7));
  });
  it("mede texto com as larguras da Helvetica", () => {
    assert.ok(larguraTexto("WWW", 10) > larguraTexto("iii", 10));
    assert.equal(larguraTexto("ã", 10), larguraTexto("a", 10));
  });
});

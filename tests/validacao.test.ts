import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  completarCpf,
  cpfValido,
  dataBRparaISO,
  idade,
  mascaraCpf,
  mascaraData,
  mascaraTelefone,
  paraCentavos,
  paraDecimal,
  telefoneValido,
} from "../lib/validacao.ts";

describe("CPF", () => {
  it("aceita CPF com dígitos verificadores corretos (com ou sem pontuação)", () => {
    assert.equal(cpfValido("529.982.247-25"), true);
    assert.equal(cpfValido("52998224725"), true);
  });
  it("recusa dígito verificador errado, tamanho errado e sequências repetidas", () => {
    assert.equal(cpfValido("529.982.247-26"), false);
    assert.equal(cpfValido("5299822472"), false);
    assert.equal(cpfValido("111.111.111-11"), false);
  });
  it("completarCpf gera um CPF válido a partir de 9 dígitos", () => {
    for (const nove of ["123456789", "987654321", "100000000"]) assert.equal(cpfValido(completarCpf(nove)), true);
  });
});

describe("telefone", () => {
  it("aceita celular (11 dígitos) e fixo (10 dígitos) com DDD", () => {
    assert.equal(telefoneValido("(11) 91234-5678"), true);
    assert.equal(telefoneValido("(11) 3123-4567"), true);
  });
  it("recusa DDD com zero, celular sem o 9 e tamanhos errados", () => {
    assert.equal(telefoneValido("(01) 91234-5678"), false);
    assert.equal(telefoneValido("(11) 81234-56789"), false);
    assert.equal(telefoneValido("1234"), false);
  });
});

describe("datas", () => {
  it("converte dd/mm/aaaa para ISO e aceita ISO", () => {
    assert.equal(dataBRparaISO("31/12/1990"), "1990-12-31");
    assert.equal(dataBRparaISO("1990-12-31"), "1990-12-31");
  });
  it("recusa datas que não existem", () => {
    assert.equal(dataBRparaISO("31/02/2020"), null);
    assert.equal(dataBRparaISO("29/02/2023"), null);
    assert.equal(dataBRparaISO("29/02/2024"), "2024-02-29");
    assert.equal(dataBRparaISO("1/1/2020"), null);
  });
  it("calcula a idade considerando se já fez aniversário no ano", () => {
    assert.equal(idade("2000-06-15", "2026-06-14"), 25);
    assert.equal(idade("2000-06-15", "2026-06-15"), 26);
  });
});

describe("máscaras", () => {
  it("formatam enquanto a pessoa digita", () => {
    assert.equal(mascaraCpf("5299822"), "529.982.2");
    assert.equal(mascaraCpf("52998224725999"), "529.982.247-25");
    assert.equal(mascaraTelefone("11912345678"), "(11) 91234-5678");
    assert.equal(mascaraTelefone("1131234567"), "(11) 3123-4567");
    assert.equal(mascaraData("3112199"), "31/12/199");
  });
});

describe("números", () => {
  it("lê valores em reais nos formatos comuns", () => {
    assert.equal(paraCentavos("99,90"), 9990);
    assert.equal(paraCentavos("1.299,90"), 129990);
    assert.equal(paraCentavos("R$ 99"), 9900);
    assert.equal(paraCentavos("99.90"), 9990);
    assert.equal(paraCentavos("abc"), null);
  });
  it("lê decimais com vírgula ou ponto", () => {
    assert.equal(paraDecimal("72,5"), 72.5);
    assert.equal(paraDecimal(""), null);
    assert.ok(Number.isNaN(paraDecimal("7a")));
  });
});

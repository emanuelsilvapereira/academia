// Relatórios exportáveis (CSV e PDF). Cada um usa as mesmas consultas das telas.
import type Database from "better-sqlite3";
import { ACAO_ROTULO, ENTIDADE_ROTULO, type Acao } from "./auditoria.ts";
import {
  alunosEmRisco,
  DIAS_RISCO,
  DIAS_VENCIMENTO,
  filtrosDaUrl,
  inadimplentes,
  listarAlunos,
  pagamentosRecebidos,
  vencimentosProximos,
} from "./consultas.ts";
import { FORMA_ROTULO, formatarCpf, formatarData, formatarTelefone, rotuloMes, SITUACAO_ROTULO } from "./format.ts";
import type { ColunaPdf } from "./pdf.ts";
import type { Permissao } from "./permissoes.ts";
import { consultarAuditoria, filtrosAuditoria } from "./relatorio-auditoria.ts";

export type Relatorio = { titulo: string; subtitulo: string; arquivo: string; colunas: ColunaPdf[]; linhas: string[][] };

/** Valor em reais sem o "R$", para a planilha reconhecer como número: 1234,5 -> "1.234,50". */
const reais = (c: number) => (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Definicao = {
  permissao: Permissao;
  montar: (db: Database.Database, p: URLSearchParams, hoje: string) => Relatorio;
};

export const RELATORIOS: Record<string, Definicao> = {
  alunos: {
    permissao: "relatorios.exportar",
    montar: (db, p, hoje) => {
      const f = filtrosDaUrl((k) => p.get(k) ?? "");
      const { linhas } = listarAlunos(db, f, hoje, null);
      const filtros = [
        f.q && `busca "${f.q}"`,
        f.situacao && SITUACAO_ROTULO[f.situacao],
        f.plano && `plano ${(db.prepare("SELECT nome FROM plano WHERE id = ?").get(f.plano) as { nome: string } | undefined)?.nome ?? ""}`,
        f.instrutor && `instrutor ${(db.prepare("SELECT nome FROM instrutor WHERE id = ?").get(f.instrutor) as { nome: string } | undefined)?.nome ?? ""}`,
      ].filter(Boolean);
      return {
        titulo: "Alunos",
        subtitulo: `${linhas.length} alunos${filtros.length ? ` · filtros: ${filtros.join(", ")}` : ""}`,
        arquivo: "alunos",
        colunas: [
          { titulo: "Nome", largura: 3 },
          { titulo: "CPF", largura: 1.6 },
          { titulo: "Telefone", largura: 1.6 },
          { titulo: "E-mail", largura: 2.7 },
          { titulo: "Plano", largura: 1.3 },
          { titulo: "Situação", largura: 2.1 },
          { titulo: "Vence em", largura: 1.2 },
          { titulo: "Último treino", largura: 1.3 },
          { titulo: "Instrutor", largura: 1.8 },
        ],
        linhas: linhas.map((a) => [
          a.nome,
          formatarCpf(a.cpf),
          formatarTelefone(a.telefone),
          a.email,
          a.plano_nome ?? "",
          SITUACAO_ROTULO[a.situacao],
          a.fim ? formatarData(a.fim) : "",
          a.ultima_presenca ? formatarData(a.ultima_presenca) : "",
          a.instrutor_nome ?? "",
        ]),
      };
    },
  },

  inadimplencia: {
    permissao: "financeiro.ver",
    montar: (db, _p, hoje) => {
      const lista = inadimplentes(db, hoje);
      const total = lista.reduce((s, a) => s + a.devido, 0);
      return {
        titulo: "Inadimplência",
        subtitulo: `${lista.length} alunos em atraso · total devido R$ ${reais(total)} · posição de ${formatarData(hoje)}`,
        arquivo: "inadimplencia",
        colunas: [
          { titulo: "Aluno", largura: 3 },
          { titulo: "Telefone", largura: 1.6 },
          { titulo: "Plano", largura: 1.3 },
          { titulo: "Parcelas", largura: 0.9, direita: true },
          { titulo: "Dias de atraso", largura: 1.2, direita: true },
          { titulo: "Devido (R$)", largura: 1.3, direita: true },
        ],
        linhas: lista.map((a) => [a.nome, formatarTelefone(a.telefone), a.plano_nome ?? "", String(a.parcelas_atrasadas), String(a.dias_atraso), reais(a.devido)]),
      };
    },
  },

  vencimentos: {
    permissao: "relatorios.exportar",
    montar: (db, _p, hoje) => {
      const lista = vencimentosProximos(db, hoje);
      return {
        titulo: "Vencimentos próximos",
        subtitulo: `Matrículas que terminam em até ${DIAS_VENCIMENTO} dias sem renovação · ${lista.length} alunos`,
        arquivo: "vencimentos",
        colunas: [
          { titulo: "Aluno", largura: 3 },
          { titulo: "Telefone", largura: 1.6 },
          { titulo: "Plano", largura: 1.4 },
          { titulo: "Vence em", largura: 1.2 },
          { titulo: "Dias", largura: 0.8, direita: true },
        ],
        linhas: lista.map((v) => [v.nome, formatarTelefone(v.telefone), v.plano_nome ?? "", formatarData(v.fim), String(v.dias)]),
      };
    },
  },

  risco: {
    permissao: "relatorios.exportar",
    montar: (db, _p, hoje) => {
      const lista = alunosEmRisco(db, hoje);
      return {
        titulo: "Alunos em risco",
        subtitulo: `Matrícula válida e sem treinar há mais de ${DIAS_RISCO} dias · ${lista.length} alunos`,
        arquivo: "alunos-em-risco",
        colunas: [
          { titulo: "Aluno", largura: 3 },
          { titulo: "Telefone", largura: 1.6 },
          { titulo: "Plano", largura: 1.3 },
          { titulo: "Último treino", largura: 1.3 },
          { titulo: "Dias sem treinar", largura: 1.3, direita: true },
          { titulo: "Instrutor", largura: 1.8 },
        ],
        linhas: lista.map((r) => [
          r.nome,
          formatarTelefone(r.telefone),
          r.plano_nome ?? "",
          r.ultima_presenca ? formatarData(r.ultima_presenca) : "nunca veio",
          String(r.dias_sem_treinar ?? ""),
          r.instrutor_nome ?? "",
        ]),
      };
    },
  },

  pagamentos: {
    permissao: "financeiro.ver",
    montar: (db, p, hoje) => {
      const mes = /^\d{4}-\d{2}$/.test(p.get("mes") ?? "") ? p.get("mes")! : hoje.slice(0, 7);
      const lista = pagamentosRecebidos(db, mes);
      const total = lista.reduce((s, x) => s + x.valor_centavos, 0);
      return {
        titulo: `Pagamentos recebidos · ${rotuloMes(mes)}`,
        subtitulo: `${lista.length} pagamentos · total R$ ${reais(total)}`,
        arquivo: `pagamentos-${mes}`,
        colunas: [
          { titulo: "Pago em", largura: 1.1 },
          { titulo: "Aluno", largura: 3 },
          { titulo: "Parcela", largura: 1.6 },
          { titulo: "Vencimento", largura: 1.1 },
          { titulo: "Forma", largura: 1 },
          { titulo: "Valor (R$)", largura: 1.2, direita: true },
        ],
        linhas: lista.map((x) => [
          formatarData(x.pago_em),
          x.nome,
          `${x.plano_nome}${x.meses > 1 ? ` ${x.parcela}/${x.meses}` : ""}`,
          formatarData(x.vencimento),
          FORMA_ROTULO[x.forma] ?? x.forma,
          reais(x.valor_centavos),
        ]),
      };
    },
  },

  frequencia: {
    permissao: "relatorios.exportar",
    montar: (db, _p, hoje) => {
      const lista = db
        .prepare(
          `SELECT pr.hora, pr.saida, a.nome FROM presenca pr JOIN aluno a ON a.id = pr.aluno_id
           WHERE pr.data = ? ORDER BY pr.hora`,
        )
        .all(hoje) as { hora: string; saida: string | null; nome: string }[];
      return {
        titulo: `Frequência · ${formatarData(hoje)}`,
        subtitulo: `${lista.length} entradas no dia`,
        arquivo: `frequencia-${hoje}`,
        colunas: [
          { titulo: "Aluno", largura: 3 },
          { titulo: "Entrada", largura: 1 },
          { titulo: "Saída", largura: 1 },
        ],
        linhas: lista.map((e) => [e.nome, e.hora, e.saida ?? "na academia"]),
      };
    },
  },

  auditoria: {
    permissao: "auditoria.ver",
    montar: (db, p) => {
      const f = filtrosAuditoria((k) => p.get(k) ?? "");
      const { total, linhas } = consultarAuditoria(db, f, null);
      return {
        titulo: "Log de auditoria",
        subtitulo: `${total} registros${total > linhas.length ? ` (mostrando os ${linhas.length} mais recentes)` : ""}`,
        arquivo: "auditoria",
        colunas: [
          { titulo: "Quando", largura: 1.6 },
          { titulo: "Usuário", largura: 2 },
          { titulo: "Ação", largura: 1.4 },
          { titulo: "Área", largura: 1.2 },
          { titulo: "Descrição", largura: 5 },
        ],
        linhas: linhas.map((l) => [
          `${formatarData(l.quando)} ${l.quando.slice(11, 19)}`,
          l.usuario_email,
          ACAO_ROTULO[l.acao as Acao] ?? l.acao,
          ENTIDADE_ROTULO[l.entidade] ?? l.entidade,
          l.descricao,
        ]),
      };
    },
  },
};

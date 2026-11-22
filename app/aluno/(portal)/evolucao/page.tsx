import { GraficoLinha } from "@/components/grafico-linha";
import { exigirAluno } from "@/lib/auth-aluno";
import { getDb } from "@/lib/db";
import { decimal, formatarData } from "@/lib/format";

export const metadata = { title: "Evolução · Pulso" };

type Avaliacao = {
  id: number;
  data: string;
  peso_kg: number;
  altura_cm: number;
  gordura_pct: number | null;
  cintura_cm: number | null;
  quadril_cm: number | null;
  braco_cm: number | null;
  coxa_cm: number | null;
  instrutor_nome: string | null;
};

function faixaImc(imc: number): string {
  if (imc < 18.5) return "abaixo do peso";
  if (imc < 25) return "peso adequado";
  if (imc < 30) return "sobrepeso";
  return "obesidade";
}

function Diferenca({ antes, agora, unidade }: { antes: number | null | undefined; agora: number | null | undefined; unidade: string }) {
  if (antes == null || agora == null) return <span className="muted">—</span>;
  const d = agora - antes;
  return (
    <span>
      {d > 0 ? "+" : ""}
      {decimal(d)} {unidade}
    </span>
  );
}

export default async function EvolucaoAlunoPage() {
  const { id } = await exigirAluno();
  const avaliacoes = getDb()
    .prepare(
      `SELECT av.*, i.nome AS instrutor_nome FROM avaliacao av LEFT JOIN instrutor i ON i.id = av.instrutor_id
       WHERE av.aluno_id = ? ORDER BY av.data`,
    )
    .all(id) as Avaliacao[];
  const primeira = avaliacoes[0];
  const ultima = avaliacoes[avaliacoes.length - 1];
  const imc = ultima ? ultima.peso_kg / (ultima.altura_cm / 100) ** 2 : null;
  const massaMagra = ultima?.gordura_pct != null ? ultima.peso_kg * (1 - ultima.gordura_pct / 100) : null;

  return (
    <>
      <header className="head">
        <div>
          <h1>Evolução</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Resultados das suas avaliações físicas feitas com o instrutor.
          </p>
        </div>
      </header>

      {avaliacoes.length === 0 ? (
        <div className="panel">
          <p>Você ainda não fez avaliação física. Peça ao seu instrutor para agendar.</p>
        </div>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi">
              <span className="rotulo">Peso</span>
              <span className="num">{decimal(ultima.peso_kg)} kg</span>
              <span className="muted small">
                <Diferenca antes={primeira.peso_kg} agora={ultima.peso_kg} unidade="kg" /> desde a 1ª avaliação
              </span>
            </div>
            <div className="kpi">
              <span className="rotulo">Gordura corporal</span>
              <span className="num">{ultima.gordura_pct != null ? `${decimal(ultima.gordura_pct)}%` : "—"}</span>
              <span className="muted small">
                <Diferenca antes={primeira.gordura_pct} agora={ultima.gordura_pct} unidade="pontos" />
              </span>
            </div>
            <div className="kpi">
              <span className="rotulo">IMC</span>
              <span className="num">{imc ? decimal(imc) : "—"}</span>
              <span className="muted small">{imc ? faixaImc(imc) : ""}</span>
            </div>
            <div className="kpi">
              <span className="rotulo">Massa magra</span>
              <span className="num">{massaMagra ? `${decimal(massaMagra)} kg` : "—"}</span>
              <span className="muted small">peso sem a gordura</span>
            </div>
          </div>

          <div className="graficos-dois" style={{ marginBottom: 32 }}>
            <GraficoLinha titulo="Peso" unidade="kg" pontos={avaliacoes.map((a) => ({ data: a.data, valor: a.peso_kg }))} />
            <GraficoLinha
              titulo="Gordura corporal"
              unidade="%"
              pontos={avaliacoes.filter((a) => a.gordura_pct !== null).map((a) => ({ data: a.data, valor: a.gordura_pct! }))}
            />
            <GraficoLinha
              titulo="Cintura"
              unidade="cm"
              pontos={avaliacoes.filter((a) => a.cintura_cm !== null).map((a) => ({ data: a.data, valor: a.cintura_cm! }))}
            />
            <GraficoLinha
              titulo="Braço"
              unidade="cm"
              pontos={avaliacoes.filter((a) => a.braco_cm !== null).map((a) => ({ data: a.data, valor: a.braco_cm! }))}
            />
          </div>

          <section className="secao">
            <h2 className="secao-titulo">Todas as avaliações ({avaliacoes.length})</h2>
            <div className="tabela">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Peso</th>
                    <th>Gordura</th>
                    <th>Cintura</th>
                    <th>Quadril</th>
                    <th>Braço</th>
                    <th>Coxa</th>
                    <th>Instrutor</th>
                  </tr>
                </thead>
                <tbody>
                  {[...avaliacoes].reverse().map((a) => (
                    <tr key={a.id}>
                      <td data-label="Data">{formatarData(a.data)}</td>
                      <td data-label="Peso">{decimal(a.peso_kg)} kg</td>
                      <td data-label="Gordura">{a.gordura_pct !== null ? `${decimal(a.gordura_pct)}%` : "—"}</td>
                      <td data-label="Cintura">{decimal(a.cintura_cm)}</td>
                      <td data-label="Quadril">{decimal(a.quadril_cm)}</td>
                      <td data-label="Braço">{decimal(a.braco_cm)}</td>
                      <td data-label="Coxa">{decimal(a.coxa_cm)}</td>
                      <td data-label="Instrutor">{a.instrutor_nome ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MUSCLES } from "js-rich-body-highlighter";
import { destaquesDoExercicio, MASCARAS, NOME_AREA, REGIOES } from "../lib/corpo.ts";
import { MUSCULOS } from "../lib/musculos.ts";

describe("modelo anatômico", () => {
  const areasMasculinas = new Set(MUSCLES.filter((m) => m.gender === "male").map((m) => m.id));
  const grupos = new Set(MUSCLES.map((m) => m.group));

  it("todo músculo do sistema acende pelo menos uma área que existe no modelo", () => {
    for (const id of Object.keys(MUSCULOS)) {
      assert.ok(MASCARAS[id]?.length, `${id} sem área no modelo`);
      for (const area of MASCARAS[id]) {
        assert.ok(areasMasculinas.has(area), `${id}: área ${area} não existe no modelo`);
        assert.ok(NOME_AREA[area], `${area} sem nome em português`);
      }
    }
  });

  it("as regiões do filtro são grupos do modelo e cobrem todos os músculos", () => {
    const cobertos = new Set<string>();
    for (const [grupo, r] of Object.entries(REGIOES)) {
      assert.ok(grupos.has(grupo), `grupo ${grupo} não existe no modelo`);
      r.musculos.forEach((m) => cobertos.add(m));
    }
    assert.deepEqual([...cobertos].sort(), Object.keys(MUSCULOS).sort());
  });

  it("músculo principal vence o auxiliar quando os dois acendem a mesma área", () => {
    const d = destaquesDoExercicio(["deltoide_anterior"], ["deltoide_lateral", "triceps"]);
    assert.equal(d.find((x) => x.id === "deltoids")!.intensity, 85);
    assert.equal(d.find((x) => x.id === "deltoids_back")!.intensity, 45);
    assert.equal(d.find((x) => x.id === "triceps")!.intensity, 45);
  });
});

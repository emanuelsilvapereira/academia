"use client";

import type { InputHTMLAttributes } from "react";
import { mascaraCpf, mascaraData, mascaraTelefone } from "@/lib/validacao";

const MASCARAS = {
  cpf: { formatar: mascaraCpf, placeholder: "000.000.000-00", maxLength: 14 },
  telefone: { formatar: mascaraTelefone, placeholder: "(11) 91234-5678", maxLength: 15 },
  data: { formatar: mascaraData, placeholder: "dd/mm/aaaa", maxLength: 10 },
};

// Campo de texto que formata enquanto a pessoa digita. A validação de verdade acontece no servidor.
export function InputMascara({
  mascara,
  defaultValue,
  ...resto
}: { mascara: keyof typeof MASCARAS; defaultValue?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "defaultValue">) {
  const m = MASCARAS[mascara];
  return (
    <input
      {...resto}
      inputMode="numeric"
      autoComplete="off"
      placeholder={m.placeholder}
      maxLength={m.maxLength}
      defaultValue={defaultValue ? m.formatar(defaultValue) : ""}
      onInput={(e) => {
        const el = e.currentTarget;
        const noFim = el.selectionStart === el.value.length;
        el.value = m.formatar(el.value);
        if (noFim) el.setSelectionRange(el.value.length, el.value.length);
      }}
    />
  );
}

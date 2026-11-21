"use client";

// Alterna entre tema claro e escuro e lembra a escolha neste navegador.
// O tema inicial é definido por um script no <head> (app/layout.tsx), antes de a página aparecer.
export function ThemeToggle() {
  function alternar() {
    const raiz = document.documentElement;
    const atual = raiz.dataset.theme === "dark" ? "dark" : "light";
    const novo = atual === "dark" ? "light" : "dark";
    raiz.dataset.theme = novo;
    try {
      localStorage.setItem("pulso_tema", novo);
    } catch {
      /* sem armazenamento: o tema vale só até recarregar */
    }
  }

  return (
    <button type="button" className="theme" onClick={alternar} aria-label="Alternar entre tema claro e escuro" title="Alternar tema">
      <svg className="ico-moon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
      </svg>
      <svg className="ico-sun" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}

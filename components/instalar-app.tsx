"use client";

import { useEffect, useState } from "react";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

// Botão "Instalar no celular". No Chrome/Edge/Android usa o pedido de instalação do navegador;
// no iPhone (Safari) mostra como fazer pelo botão Compartilhar.
export function InstalarApp() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [iphone, setIphone] = useState(false);

  useEffect(() => {
    const aoPedir = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    const aoInstalar = () => setInstalado(true);
    window.addEventListener("beforeinstallprompt", aoPedir);
    window.addEventListener("appinstalled", aoInstalar);
    const timer = setTimeout(() => {
      setInstalado(window.matchMedia("(display-mode: standalone)").matches);
      setIphone(/iphone|ipad|ipod/i.test(navigator.userAgent));
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", aoPedir);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  if (instalado) return null;
  if (evento) {
    return (
      <div className="instalar">
        <p>
          <strong>Instale o Pulso no celular</strong>
          <span className="muted small">Abre direto no seu treino, como um aplicativo.</span>
        </p>
        <button
          type="button"
          className="btn primary sm"
          onClick={async () => {
            await evento.prompt();
            const { outcome } = await evento.userChoice;
            if (outcome === "accepted") setInstalado(true);
            setEvento(null);
          }}
        >
          Instalar
        </button>
      </div>
    );
  }
  if (iphone) {
    return (
      <div className="instalar">
        <p>
          <strong>Instale o Pulso no iPhone</strong>
          <span className="muted small">No Safari, toque em Compartilhar e depois em &quot;Adicionar à Tela de Início&quot;.</span>
        </p>
      </div>
    );
  }
  return null;
}

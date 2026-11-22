// Desenho do ícone do aplicativo (logo do Pulso: três círculos), usado pelo ImageResponse.
// Só usa estilos que o gerador de imagens entende (flex, bordas, cores).
export function IconeApp({ tamanho }: { tamanho: number }) {
  const anel = (d: number, borda: number) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: d,
    height: d,
    borderRadius: "50%",
    border: `${borda}px solid #f4f5f6`,
  });
  const t = tamanho;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#08090a" }}>
      <div style={anel(t * 0.56, Math.max(2, t * 0.035))}>
        <div style={anel(t * 0.31, Math.max(2, t * 0.035))}>
          <div style={{ width: t * 0.1, height: t * 0.1, borderRadius: "50%", background: "#f4f5f6" }} />
        </div>
      </div>
    </div>
  );
}

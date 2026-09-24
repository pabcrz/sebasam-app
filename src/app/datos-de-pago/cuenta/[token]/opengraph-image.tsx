import { ImageResponse } from "next/og";
import { getPublicBankNameByToken } from "@/features/payment-settings/domain";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const bankName = (await getPublicBankNameByToken(token))?.trim() || "Banco";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 24,
          background: "linear-gradient(135deg, #071426 0%, #12345a 100%)",
          color: "#ffffff",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 5, color: "#7dd3fc" }}>SEBASAM</div>
        <div style={{ fontSize: 58, fontWeight: 800 }}>Datos de cuenta bancaria</div>
        <div style={{ fontSize: 28, color: "#cbd5e1" }}>Información para realizar tu pago</div>
        <div
          style={{
            display: "flex",
            marginTop: 12,
            padding: "16px 28px",
            border: "2px solid #38bdf8",
            borderRadius: 14,
            color: "#7dd3fc",
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          {bankName}
        </div>
      </div>
    ),
    size,
  );
}

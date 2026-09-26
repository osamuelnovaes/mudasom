import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MudaSom — leve suas playlists com você",
  description: "Transfira playlists do Spotify para YouTube e YouTube Music com revisão faixa a faixa.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

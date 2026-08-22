import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";

export const metadata = {
  title: "Aether",
  description: "A shared living field of presence, memory and transformation."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}

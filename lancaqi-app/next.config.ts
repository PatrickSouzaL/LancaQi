import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit lê seus arquivos de fonte (.afm) do disco em runtime; mantê-lo fora do
  // bundle do servidor evita que o empacotador quebre esses caminhos relativos.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;

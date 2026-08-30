import type { Metadata } from "next";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Chiffre",
  description: "Collaborative budgeting and expenditure control for May Balls",
  icons: {
    icon: "/brand/chiffre-icon.png",
    apple: "/brand/chiffre-icon.png",
  },
  openGraph: {
    title: "Chiffre",
    description: "Collaborative budgeting and expenditure control for May Balls",
    images: [{ url: "/brand/chiffre-icon.png", width: 548, height: 548, alt: "Chiffre" }],
  },
  twitter: {
    card: "summary",
    title: "Chiffre",
    description: "Collaborative budgeting and expenditure control for May Balls",
    images: ["/brand/chiffre-icon.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

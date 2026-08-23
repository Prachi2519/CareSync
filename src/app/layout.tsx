import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CareSync | Healthcare appointments that stay in sync", template: "%s | CareSync" },
  description: "Book appointments, share symptoms securely, and keep every follow-up on track.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body><a className="skip-link" href="#main-content">Skip to main content</a>{children}</body>
    </html>
  );
}

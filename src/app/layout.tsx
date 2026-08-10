import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://rivaly.fun"),
  title: "Rivaly — Back your football opinion",
  description:
    "The peer-to-peer prediction arena for football. Challenge real people, not the house. Join the waitlist.",
  openGraph: {
    title: "Rivaly — Back your football opinion",
    description:
      "Challenge real people, not the house. Join the waitlist for the football prediction arena.",
    url: "https://rivaly.fun",
    siteName: "Rivaly",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rivaly — Back your football opinion",
    description: "Challenge real people, not the house. Join the waitlist.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}

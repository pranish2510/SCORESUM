import type { Metadata } from "next";
import { Inter, Kanit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./providers"; // Import the new file

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const kanit = Kanit({ 
  weight: ['400', '600', '800'], 
  subsets: ["latin"], 
  variable: "--font-kanit" 
});

export const metadata: Metadata = {
  title: "SCORESUM",
  description: "Pro Sports Scoring",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning> 
      <body className={`${inter.variable} ${kanit.variable} bg-dayBackground dark:bg-obsidian text-dayText dark:text-white font-body antialiased transition-colors duration-300`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
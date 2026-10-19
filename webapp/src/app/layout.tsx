import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, Noto_Sans_Ethiopic } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { AuthProvider } from "@/context/AuthContext";
import NotificationToastContainer from "@/components/NotificationToastContainer";

// Display font for hero headers, large deal titles, and prominent statistics
const fontDisplay = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

// Primary body font for clean UI typography and Latin scripts (including Afaan Oromoo)
const fontBody = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// Ethiopic font for Ge'ez script used in Amharic and Tigrinya, paired with native OS fallbacks
const fontEthiopic = Noto_Sans_Ethiopic({
  variable: "--font-ethiopic",
  subsets: ["ethiopic"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  fallback: ["Nyala", "Abyssinica SIL", "Kefa", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Tirf Market | Best Deals in Ethiopia",
  description: "Discover local deals on cafes, groceries, pharmacies, tailors and restaurants within 2 km. Pay securely with Safaricom M-Pesa.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontEthiopic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <LanguageProvider>
          <AuthProvider>
            {children}
            <NotificationToastContainer />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

import { Inter } from "next/font/google";
import "./globals.css";

// 🎯 FIXED: Replaced experimental Geist fonts with stable Inter typography
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter", // Custom CSS variable fallback hook
});

export const metadata = {
  title: "𝐏𝐋𝐀𝐘𝐇𝐔𝐁 | Premium Tanzanian Movie Portal",
  description: "Instant Mobile Money Video-On-Demand portal platform.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased bg-[#09090b]`}
    >
      <body className={`${inter.className} min-h-full flex flex-col`}>
        {children}
      </body>
    </html>
  );
}

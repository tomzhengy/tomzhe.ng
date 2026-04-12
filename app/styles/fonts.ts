import { Inter } from "next/font/google";
import localFont from "next/font/local";

export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const redaction = localFont({
  src: [
    {
      path: "../../public/fonts/Redaction-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Redaction-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/Redaction-Italic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-redaction",
  display: "block",
});

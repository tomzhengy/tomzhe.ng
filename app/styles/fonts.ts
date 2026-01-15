import { Inter, Crimson_Text } from "next/font/google";
import localFont from "next/font/local";

// Inter for UI elements (variable font with weights)
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// Crimson Text for body text
export const crimsonText = Crimson_Text({
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-crimson",
});

// Redaction font
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
  display: "swap",
});

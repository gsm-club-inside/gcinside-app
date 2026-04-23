import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import QueryProvider from "@/components/QueryProvider";
import CustomScrollbar from "@/components/CustomScrollbar";
import "./globals.css";

const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

export const metadata: Metadata = {
  title: "GCinside",
  description: "GSM 창체동아리 수강신청 서비스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${pretendard.variable} font-sans antialiased`}>
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
            {children}
            <CustomScrollbar />
            <Toaster position="bottom-center" />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

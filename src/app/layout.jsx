import "./globals.css";

export const metadata = {
  title: "MatchBox - 대진표 생성 및 경기 관리",
  description: "스포츠·동호회 경기를 위한 대진표 생성 및 점수 관리",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className="min-h-screen text-base text-gray-800 font-sans"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}

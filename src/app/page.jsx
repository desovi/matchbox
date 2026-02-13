import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Grid3X3, Share2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-desktop items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-gray-900"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white text-lg leading-none">
              🎾
            </span>
            <span className="text-lg leading-tight">MatchBox</span>
          </Link>
          <p className="ml-auto hidden text-sm text-muted-foreground sm:block">
            매치박스 · 스포츠 대진표
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-desktop px-4 py-12 sm:px-6 sm:py-16">
        <section className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
            대진표를
            <br />
            <span className="text-primary">쉽게</span> 만들어보세요
          </h1>
          <p className="mt-6 text-lg text-gray-600">
            복식·동호회 경기를 위한 스마트한 대진 관리
          </p>
        </section>

        <section className="mt-16">
          <h2 className="mb-4 text-center text-sm font-semibold text-muted-foreground">
            지원 종목
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Link href="/create" className="block">
              <Card className="h-full transition-all hover:scale-[1.02] hover:shadow-card-hover">
                <CardHeader className="text-center">
                  <span className="mx-auto inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-3xl leading-none">
                    🎾
                  </span>
                  <CardTitle className="mt-3 text-xl leading-tight">테니스</CardTitle>
                  <CardDescription>
                    대진표 만들기
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Card
              className={cn(
                "h-full opacity-60",
                "cursor-not-allowed select-none"
              )}
            >
              <CardHeader className="text-center">
                <span className="mx-auto inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-3xl leading-none">
                  🏸
                </span>
                <CardTitle className="mt-3 text-xl leading-tight">배드민턴</CardTitle>
                <CardDescription>
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                    준비중이에요
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>
            <Card
              className={cn(
                "h-full opacity-60",
                "cursor-not-allowed select-none"
              )}
            >
              <CardHeader className="text-center">
                <span className="mx-auto inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-3xl leading-none">
                  ⚽
                </span>
                <CardTitle className="mt-3 text-xl leading-tight">축구</CardTitle>
                <CardDescription>
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                    준비중이에요
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        <section className="mt-20">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-4 hover:scale-[1.01] sm:p-4">
              <CardHeader className="flex flex-row items-center gap-3 p-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:shrink-0">
                  <Grid3X3 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base leading-tight">다양한 방식</CardTitle>
                  <CardDescription className="text-xs">
                    토너먼트, 한울방식 등 다양한 대진
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
            <Card className="p-4 hover:scale-[1.01] sm:p-4">
              <CardHeader className="flex flex-row items-center gap-3 p-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary [&_svg]:shrink-0">
                  <Share2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base leading-tight">간편한 공유</CardTitle>
                  <CardDescription className="text-xs">
                    링크로 공유하고 점수 기록
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
            <Card className="p-4 hover:scale-[1.01] sm:p-4">
              <CardHeader className="flex flex-row items-center gap-3 p-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success [&_svg]:shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base leading-tight">전적 관리</CardTitle>
                  <CardDescription className="text-xs">
                    전적·통계 자동 계산
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </div>
        </section>
      </main>

      <footer className="mt-20 border-t border-gray-200 bg-white py-8">
        <div
          className="mx-auto max-w-desktop px-4 text-center text-sm text-muted-foreground sm:px-6"
          suppressHydrationWarning
        >
          © {new Date().getFullYear()} MatchBox for Sports V1.0
        </div>
      </footer>
    </div>
  );
}

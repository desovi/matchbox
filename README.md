# MatchBox

스포츠·동호회 대진표 생성 및 경기 결과를 관리하는 웹 애플리케이션입니다.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript** (strict mode)
- **Tailwind CSS**
- **Supabase** (PostgreSQL)
- **Vercel** 배포 지원

## 지원 대진 방식

- 한울 AA / 한울 AB / 한울 팀
- 토너먼트
- KDK
- 랜덤

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local.example`을 복사해 `.env.local`을 만들고 Supabase 값을 채웁니다.

```bash
cp .env.local.example .env.local
```

`.env.local` 예시:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Supabase 데이터베이스 마이그레이션

Supabase 프로젝트에서 SQL Editor를 열고 다음 순서로 실행합니다.

1. `supabase/migrations/20250130000001_create_brackets_table.sql`
2. `supabase/migrations/20250130000002_create_matches_table.sql`

또는 Supabase CLI로:

```bash
npx supabase db push
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

## 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx              # 랜딩
│   ├── create/page.tsx       # 대진표 생성
│   ├── bracket/[id]/page.tsx  # 대진표 보기 (공개)
│   ├── bracket/[id]/edit/     # 대진표 수정 (edit_key 필요)
│   └── api/brackets/         # API 라우트
├── components/
│   ├── ui/                   # shadcn/ui 스타일 컴포넌트
│   └── bracket/              # BracketTypeSelector, ParticipantInput, MatchCard, BracketGrid
├── lib/
│   ├── supabase/             # 클라이언트, 서버, 미들웨어
│   ├── bracket-logic/         # 대진 생성 알고리즘 (플레이스홀더)
│   ├── types.ts
│   └── utils.ts
└── styles/
```

## 스크립트

| 명령어       | 설명           |
| ------------ | -------------- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 실행   |
| `npm run format` | Prettier 포맷 |

## 배포 (Vercel)

1. 저장소를 Vercel에 연결합니다.
2. 환경 변수에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 설정합니다.
3. 배포하면 자동으로 빌드 및 배포됩니다.

## 대진 생성 알고리즘

`src/lib/bracket-logic/index.ts`에 한울 AA/AB, 팀전, 토너먼트, KDK, 랜덤용 플레이스홀더가 있습니다.  
다음 단계에서 각 방식별 로직을 구현하면 됩니다.

## 라이선스

Private

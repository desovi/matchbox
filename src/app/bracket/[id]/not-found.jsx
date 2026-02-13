import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BracketNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
      <h2 className="text-xl font-semibold">대진표를 찾을 수 없습니다</h2>
      <p className="text-muted-foreground">
        링크가 잘못되었거나 삭제되었을 수 있습니다.
      </p>
      <Button asChild>
        <Link href="/">홈으로</Link>
      </Button>
    </div>
  );
}

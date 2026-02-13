import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function EditNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
      <h2 className="text-xl font-semibold">수정할 수 없습니다</h2>
      <p className="text-muted-foreground">
        수정 키가 올바르지 않거나 대진표를 찾을 수 없습니다.
      </p>
      <Button asChild>
        <Link href="/">홈으로</Link>
      </Button>
    </div>
  );
}

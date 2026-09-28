import { PostShape } from "@/components/loading-shapes";

// One Arena post and its replies.
export default function PostLoading() {
  return (
    <main className="mx-auto min-w-0 max-w-2xl px-4 py-6 md:px-6 md:py-12">
      <div className="flex flex-col gap-3">
        <PostShape />
        <PostShape />
      </div>
    </main>
  );
}

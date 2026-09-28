import { RowsShape } from "@/components/loading-shapes";
import { Skeleton } from "@/components/ui";

// Notifications: the title and the list (the same shape the page shows
// while it reads them, so there's no second jump).
export default function NotificationsLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
      <Skeleton className="h-8 w-44" />
      <div className="mt-7">
        <RowsShape />
      </div>
    </main>
  );
}

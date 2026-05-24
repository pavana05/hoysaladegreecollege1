import { ReactNode, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, ChevronLeft, ChevronRight, Inbox } from "lucide-react";

/**
 * Reusable wrapper providing standardized search, filters, pagination,
 * and loading/empty states for principal-facing data lists.
 *
 * Consumers render their own table/cards inside `children(pagedItems)`.
 */
export default function DataTableShell<T>({
  title,
  icon: Icon,
  items,
  isLoading,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  pageSize = 10,
  emptyText = "No records found.",
  children,
}: {
  title?: string;
  icon?: any;
  items: T[];
  isLoading?: boolean;
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  pageSize?: number;
  emptyText?: string;
  children: (pagedItems: T[]) => ReactNode;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-4">
        {title && (
          <div className="flex items-center gap-2 mb-3">
            {Icon && <Icon className="w-4 h-4 text-primary" />}
            <h3 className="font-body text-sm font-bold text-foreground">{title}</h3>
            <span className="ml-auto font-body text-xs text-muted-foreground tabular-nums">
              {items.length} {items.length === 1 ? "result" : "results"}
            </span>
          </div>
        )}
        <div className="grid sm:grid-cols-[1fr,auto] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setPage(1);
              }}
              className="pl-9 rounded-xl text-sm"
            />
          </div>
          {filters && (
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
              {filters}
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-body text-sm text-muted-foreground">{emptyText}</p>
        </div>
      ) : (
        <>
          {children(paged)}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="font-body text-xs text-muted-foreground tabular-nums">
                Page {safePage} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

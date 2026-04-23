"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PlusIcon, StarIcon, CopyIcon } from "lucide-react";

interface SimpleCategory {
  id: string;
  name: string;
  color: string | null;
}

interface SimpleItem {
  id: string;
  name: string;
  price: number;
  zorder?: number;
  isDefault?: boolean;
  categoryId?: string | null;
  category?: SimpleCategory | null;
}

interface SimpleItemChipGridProps {
  title: string;
  emptyKey: string;
  items: SimpleItem[];
  categories?: SimpleCategory[];
  onAdd: () => void;
  onEdit: (item: SimpleItem) => void;
  onCopyFromClass?: () => void;
  readOnly?: boolean;
}

export function SimpleItemChipGrid({
  title,
  emptyKey,
  items,
  categories,
  onAdd,
  onEdit,
  onCopyFromClass,
  readOnly = false,
}: SimpleItemChipGridProps) {
  const t = useTranslations("loadouts");
  const tc = useTranslations("common");

  const hasCategories = categories && categories.length > 0;

  // Group by category
  const grouped = useMemo(() => {
    if (!hasCategories) return null;

    const groups: { category: SimpleCategory | null; items: SimpleItem[] }[] = [];
    const catMap = new Map<string, SimpleItem[]>();
    const uncategorized: SimpleItem[] = [];

    for (const item of items) {
      if (item.categoryId) {
        const existing = catMap.get(item.categoryId);
        if (existing) existing.push(item);
        else catMap.set(item.categoryId, [item]);
      } else {
        uncategorized.push(item);
      }
    }

    // Sort categories by name
    const sortedIds = Array.from(catMap.keys()).sort((a, b) => {
      const catA = categories!.find((c) => c.id === a);
      const catB = categories!.find((c) => c.id === b);
      return (catA?.name ?? "").localeCompare(catB?.name ?? "");
    });

    for (const catId of sortedIds) {
      const catItems = catMap.get(catId)!;
      const cat = catItems[0]?.category ?? categories!.find((c) => c.id === catId) ?? null;
      catItems.sort((a, b) => (a.zorder ?? 0) - (b.zorder ?? 0) || a.name.localeCompare(b.name));
      groups.push({ category: cat, items: catItems });
    }

    if (uncategorized.length > 0) {
      uncategorized.sort((a, b) => (a.zorder ?? 0) - (b.zorder ?? 0) || a.name.localeCompare(b.name));
      groups.push({ category: null, items: uncategorized });
    }

    return groups;
  }, [items, categories, hasCategories]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          {title}
        </h3>
        {!readOnly && (
          <>
            <Button
              variant="outline"
              size="xs"
              onClick={onAdd}
              aria-label={tc("add")}
            >
              <PlusIcon data-icon="inline-start" />
              <span className="hidden sm:inline">{tc("add")}</span>
            </Button>
            {onCopyFromClass && (
              <Button
                variant="outline"
                size="xs"
                onClick={onCopyFromClass}
                aria-label={t("copyFromClass")}
              >
                <CopyIcon data-icon="inline-start" />
                <span className="hidden sm:inline">{t("copyFromClass")}</span>
              </Button>
            )}
          </>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-600">
          {t(emptyKey)}
        </div>
      ) : hasCategories && grouped ? (
        <div className="space-y-4">
          {grouped.map(({ category, items: catItems }, idx) => (
            <div key={category?.id ?? `uncat-${idx}`}>
              {category && (
                <div className="mb-2 flex items-center gap-2">
                  {category.color && (
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                  )}
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    {category.name}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {catItems.map((item) => (
                  <ItemChip key={item.id} item={item} onClick={readOnly ? undefined : () => onEdit(item)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <ItemChip key={item.id} item={item} onClick={readOnly ? undefined : () => onEdit(item)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemChip({ item, onClick }: { item: { name: string; price: number; isDefault?: boolean; category?: { color: string | null } | null }; onClick?: () => void }) {
  const t = useTranslations("loadouts");
  const color = item.category?.color || null;

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick(); } : undefined}
      className={`group relative flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-1.5 text-left transition-colors ${onClick ? "hover:border-zinc-600 hover:bg-zinc-900/50 cursor-pointer" : ""}`}
      style={color ? {
        borderLeftWidth: "3px",
        borderLeftColor: color,
        backgroundColor: `${color}10`,
      } : { backgroundColor: "rgb(39 39 42)" }}
    >
      <span className="text-sm font-medium text-zinc-200">{item.name}</span>
      <span
        className="text-xs font-mono"
        style={{ color: item.price === 0 ? "#22c55e" : "#a1a1aa" }}
      >
        {item.price === 0 ? t("free") : `${item.price.toLocaleString("de-DE")} XP`}
      </span>
      {item.isDefault && (
        <StarIcon className="size-3 text-amber-400 shrink-0" />
      )}
    </div>
  );
}

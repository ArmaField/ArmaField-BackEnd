"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PlusIcon, StarIcon, CopyIcon } from "lucide-react";
import type { Weapon, WeaponCategory } from "./types";

interface WeaponChipGridProps {
  title: string;
  weapons: Weapon[];
  categories: WeaponCategory[];
  onAdd: () => void;
  onEdit: (weapon: Weapon) => void;
  onCopyFromClass?: () => void;
  readOnly?: boolean;
}

export function WeaponChipGrid({
  title,
  weapons,
  categories,
  onAdd,
  onEdit,
  onCopyFromClass,
  readOnly = false,
}: WeaponChipGridProps) {
  const t = useTranslations("loadouts");
  const tc = useTranslations("common");

  // Group weapons by category, sorted by price within each group (FREE first)
  const groupedWeapons = useMemo(() => {
    const groups: { category: WeaponCategory; weapons: Weapon[] }[] = [];
    const categoryMap = new Map<string, Weapon[]>();

    for (const weapon of weapons) {
      const existing = categoryMap.get(weapon.categoryId);
      if (existing) {
        existing.push(weapon);
      } else {
        categoryMap.set(weapon.categoryId, [weapon]);
      }
    }

    // Sort categories by name, then weapons within by price
    const sortedCategoryIds = Array.from(categoryMap.keys()).sort((a, b) => {
      const catA = categories.find((c) => c.id === a);
      const catB = categories.find((c) => c.id === b);
      return (catA?.name ?? "").localeCompare(catB?.name ?? "");
    });

    for (const catId of sortedCategoryIds) {
      const catWeapons = categoryMap.get(catId)!;
      const cat = catWeapons[0].category;
      catWeapons.sort((a, b) => a.zorder - b.zorder || a.name.localeCompare(b.name));
      groups.push({ category: cat, weapons: catWeapons });
    }

    return groups;
  }, [weapons, categories]);

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

      {weapons.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-600">
          {t("noWeapons")}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedWeapons.map(({ category, weapons: catWeapons }) => (
            <div key={category.id}>
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
              <div className="flex flex-wrap gap-2">
                {catWeapons.map((weapon) => (
                  <WeaponChip
                    key={weapon.id}
                    weapon={weapon}
                    onClick={readOnly ? undefined : () => onEdit(weapon)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WeaponChip({
  weapon,
  onClick,
}: {
  weapon: Weapon;
  onClick?: () => void;
}) {
  const t = useTranslations("loadouts");
  const color = weapon.category.color || "#6b7280";

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick(); } : undefined}
      className={`group relative flex items-center gap-2 rounded-md border border-zinc-800 px-3 py-1.5 text-left transition-colors ${onClick ? "hover:border-zinc-700 hover:bg-zinc-900/50 cursor-pointer" : ""}`}
      style={{
        borderLeftWidth: "3px",
        borderLeftColor: color,
        backgroundColor: `${color}10`,
      }}
    >
      <span className="text-sm font-medium text-zinc-200">{weapon.name}</span>
      <span
        className="text-xs font-mono"
        style={{ color: weapon.price === 0 ? "#22c55e" : "#a1a1aa" }}
      >
        {weapon.price === 0 ? t("free") : `${weapon.price.toLocaleString("de-DE")} XP`}
      </span>
      {weapon.isDefault && (
        <StarIcon className="size-3 text-amber-400 shrink-0" />
      )}
    </div>
  );
}

"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsIcon, SearchIcon } from "lucide-react";
import { WeaponChipGrid } from "./weapon-chip-grid";
import { WeaponDialog } from "./weapon-dialog";
import { CategoryManagementDialog } from "./category-management-dialog";
import { SimpleItemChipGrid } from "./simple-item-chip-grid";
import { SimpleItemDialog } from "./simple-item-dialog";
import { CopyFromClassDialog } from "./copy-from-class-dialog";
import { CLASSES, type Class, type Weapon, type WeaponCategory, type Gadget, type Grenade } from "./types";

interface LoadoutsPageClientProps {
  initialWeapons: Weapon[];
  initialCategories: WeaponCategory[];
  initialGadgets: Gadget[];
  initialGrenades: Grenade[];
  testMode?: boolean;
}

export function LoadoutsPageClient({
  initialWeapons,
  initialCategories,
  initialGadgets,
  initialGrenades,
  testMode = false,
}: LoadoutsPageClientProps) {
  const t = useTranslations("loadouts");
  const tc = useTranslations("common");

  const [weapons, setWeapons] = useState<Weapon[]>(initialWeapons);
  const [categories, setCategories] =
    useState<WeaponCategory[]>(initialCategories);
  const [gadgets, setGadgets] = useState<Gadget[]>(initialGadgets);
  const [grenades, setGrenades] = useState<Grenade[]>(initialGrenades);
  const [activeClass, setActiveClass] = useState<Class>("ASSAULT");
  const [search, setSearch] = useState("");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [weaponDialogOpen, setWeaponDialogOpen] = useState(false);
  const [editingWeapon, setEditingWeapon] = useState<Weapon | null>(null);
  const [addWeaponType, setAddWeaponType] = useState<
    "PRIMARY" | "SECONDARY" | "SPECIAL"
  >("PRIMARY");

  // Gadget dialog state
  const [gadgetDialogOpen, setGadgetDialogOpen] = useState(false);
  const [editingGadget, setEditingGadget] = useState<Gadget | null>(null);

  // Grenade dialog state
  const [grenadeDialogOpen, setGrenadeDialogOpen] = useState(false);
  const [editingGrenade, setEditingGrenade] = useState<Grenade | null>(null);

  // Shared "Copy from class" dialog state
  const [copyDialog, setCopyDialog] = useState<{
    title: string;
    apiPath: string;
    type?: "PRIMARY" | "SECONDARY" | "SPECIAL";
    onSuccess: () => void;
  } | null>(null);

  const refreshWeapons = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/weapons");
      if (res.ok) {
        const data = await res.json();
        setWeapons(data);
      }
    } catch {
      // Silent refresh failure
    }
  }, []);

  const refreshCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/weapon-categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch {
      // Silent refresh failure
    }
  }, []);

  const refreshGadgets = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/gadgets");
      if (res.ok) {
        const data = await res.json();
        setGadgets(data);
      }
    } catch {
      // Silent refresh failure
    }
  }, []);

  const refreshGrenades = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/grenades");
      if (res.ok) {
        const data = await res.json();
        setGrenades(data);
      }
    } catch {
      // Silent refresh failure
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshWeapons(), refreshCategories(), refreshGadgets(), refreshGrenades()]);
  }, [refreshWeapons, refreshCategories, refreshGadgets, refreshGrenades]);

  const filteredWeapons = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return weapons.filter((w) => {
      if (w.class !== activeClass) return false;
      if (lowerSearch && !w.name.toLowerCase().includes(lowerSearch)) return false;
      return true;
    });
  }, [weapons, activeClass, search]);

  const primaryWeapons = useMemo(
    () => filteredWeapons.filter((w) => w.type === "PRIMARY"),
    [filteredWeapons]
  );

  const secondaryWeapons = useMemo(
    () => filteredWeapons.filter((w) => w.type === "SECONDARY"),
    [filteredWeapons]
  );

  const specialWeapons = useMemo(
    () => filteredWeapons.filter((w) => w.type === "SPECIAL"),
    [filteredWeapons]
  );

  const filteredGadgets = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return gadgets.filter((g) => {
      if (g.class !== activeClass) return false;
      if (lowerSearch && !g.name.toLowerCase().includes(lowerSearch)) return false;
      return true;
    });
  }, [gadgets, activeClass, search]);

  const filteredGrenades = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return grenades.filter((g) => {
      if (g.class !== activeClass) return false;
      if (lowerSearch && !g.name.toLowerCase().includes(lowerSearch)) return false;
      return true;
    });
  }, [grenades, activeClass, search]);

  const handleAddWeapon = (type: "PRIMARY" | "SECONDARY" | "SPECIAL") => {
    setEditingWeapon(null);
    setAddWeaponType(type);
    setWeaponDialogOpen(true);
  };

  const handleEditWeapon = (weapon: Weapon) => {
    setEditingWeapon(weapon);
    setAddWeaponType(weapon.type);
    setWeaponDialogOpen(true);
  };

  const handleAddGadget = () => {
    setEditingGadget(null);
    setGadgetDialogOpen(true);
  };

  const handleEditGadget = (gadget: { id: string; name: string; price: number }) => {
    const full = gadgets.find((g) => g.id === gadget.id);
    if (full) {
      setEditingGadget(full);
      setGadgetDialogOpen(true);
    }
  };

  const handleAddGrenade = () => {
    setEditingGrenade(null);
    setGrenadeDialogOpen(true);
  };

  const handleEditGrenade = (grenade: { id: string; name: string; price: number }) => {
    const full = grenades.find((g) => g.id === grenade.id);
    if (full) {
      setEditingGrenade(full);
      setGrenadeDialogOpen(true);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        {!testMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCategoryDialogOpen(true)}
          >
            <SettingsIcon data-icon="inline-start" />
            {t("manageCategories")}
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-xs">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Class Tabs */}
      <Tabs
        value={activeClass}
        onValueChange={(val) => setActiveClass(val as Class)}
      >
        <TabsList variant="line">
          {CLASSES.map((cls) => (
            <TabsTrigger key={cls} value={cls}>
              {cls}
            </TabsTrigger>
          ))}
        </TabsList>

        {CLASSES.map((cls) => (
          <TabsContent key={cls} value={cls} className="mt-4 space-y-4">
            {/* Primary Weapons */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
              <WeaponChipGrid
                title={t("primaryWeapons")}
                weapons={primaryWeapons}
                categories={categories}
                onAdd={() => handleAddWeapon("PRIMARY")}
                onEdit={handleEditWeapon}
                onCopyFromClass={() =>
                  setCopyDialog({
                    title: t("copyPrimaryFromClassTitle"),
                    apiPath: "/api/admin/weapons/copy-from-class",
                    type: "PRIMARY",
                    onSuccess: refreshWeapons,
                  })
                }
                readOnly={testMode}
              />
            </div>

            {/* Secondary Weapons (Pistols) */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
              <WeaponChipGrid
                title={t("secondaryWeapons")}
                weapons={secondaryWeapons}
                categories={categories}
                onAdd={() => handleAddWeapon("SECONDARY")}
                onEdit={handleEditWeapon}
                onCopyFromClass={() =>
                  setCopyDialog({
                    title: t("copySecondaryFromClassTitle"),
                    apiPath: "/api/admin/weapons/copy-from-class",
                    type: "SECONDARY",
                    onSuccess: refreshWeapons,
                  })
                }
                readOnly={testMode}
              />
            </div>

            {/* Special Weapons (RPG, Drone Jammer, etc.) */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
              <WeaponChipGrid
                title={t("specialWeapons")}
                weapons={specialWeapons}
                categories={categories}
                onAdd={() => handleAddWeapon("SPECIAL")}
                onEdit={handleEditWeapon}
                onCopyFromClass={() =>
                  setCopyDialog({
                    title: t("copySpecialFromClassTitle"),
                    apiPath: "/api/admin/weapons/copy-from-class",
                    type: "SPECIAL",
                    onSuccess: refreshWeapons,
                  })
                }
                readOnly={testMode}
              />
            </div>

            {/* Gadgets */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
              <SimpleItemChipGrid
                title={t("gadgets")}
                emptyKey="noGadgets"
                items={filteredGadgets}
                categories={categories}
                onAdd={handleAddGadget}
                onEdit={handleEditGadget}
                onCopyFromClass={() =>
                  setCopyDialog({
                    title: t("copyGadgetsFromClassTitle"),
                    apiPath: "/api/admin/gadgets/copy-from-class",
                    onSuccess: refreshGadgets,
                  })
                }
                readOnly={testMode}
              />
            </div>

            {/* Grenades */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
              <SimpleItemChipGrid
                title={t("grenades")}
                emptyKey="noGrenades"
                items={filteredGrenades}
                categories={categories}
                onAdd={handleAddGrenade}
                onEdit={handleEditGrenade}
                onCopyFromClass={() =>
                  setCopyDialog({
                    title: t("copyGrenadesFromClassTitle"),
                    apiPath: "/api/admin/grenades/copy-from-class",
                    onSuccess: refreshGrenades,
                  })
                }
                readOnly={testMode}
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Weapon Create/Edit Dialog */}
      <WeaponDialog
        open={weaponDialogOpen}
        onOpenChange={(open) => {
          if (!open) setEditingWeapon(null);
          setWeaponDialogOpen(open);
        }}
        weapon={editingWeapon}
        defaultType={addWeaponType}
        defaultClass={activeClass}
        categories={categories}
        onSuccess={refreshWeapons}
      />

      {/* Category Management Dialog */}
      <CategoryManagementDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        categories={categories}
        onSuccess={refreshAll}
      />

      {/* Gadget Create/Edit Dialog */}
      <SimpleItemDialog
        open={gadgetDialogOpen}
        onOpenChange={(open) => {
          if (!open) setEditingGadget(null);
          setGadgetDialogOpen(open);
        }}
        item={editingGadget}
        defaultClass={activeClass}
        itemLabel={t("gadgets")}
        apiPath="/api/admin/gadgets"
        itemType="GADGET"
        categories={categories}
        onSuccess={refreshGadgets}
      />

      {/* Grenade Create/Edit Dialog */}
      <SimpleItemDialog
        open={grenadeDialogOpen}
        onOpenChange={(open) => {
          if (!open) setEditingGrenade(null);
          setGrenadeDialogOpen(open);
        }}
        item={editingGrenade}
        defaultClass={activeClass}
        itemLabel={t("grenades")}
        apiPath="/api/admin/grenades"
        itemType="GRENADE"
        categories={categories}
        onSuccess={refreshGrenades}
      />

      {/* Copy from class dialog (shared by all sections) */}
      {copyDialog && (
        <CopyFromClassDialog
          open={!!copyDialog}
          onOpenChange={(open) => { if (!open) setCopyDialog(null); }}
          title={copyDialog.title}
          targetClass={activeClass}
          apiPath={copyDialog.apiPath}
          type={copyDialog.type}
          onSuccess={copyDialog.onSuccess}
        />
      )}

    </div>
  );
}

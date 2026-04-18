import { getSessionOrTest } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoadoutsPageClient } from "@/components/admin/loadouts/loadouts-page-client";
import { TEST_MODE } from "@/lib/test-mode";
import { TEST_CATEGORIES, TEST_WEAPONS, TEST_GADGETS, TEST_GRENADES } from "@/lib/test-loadout-data";

export const dynamic = "force-dynamic";

export default async function LoadoutsPage() {
  const session = await getSessionOrTest();
  if (!session?.user) redirect("/login");

  if (TEST_MODE) {
    return (
      <LoadoutsPageClient
        initialWeapons={TEST_WEAPONS}
        initialCategories={TEST_CATEGORIES}
        initialGadgets={TEST_GADGETS}
        initialGrenades={TEST_GRENADES}
        testMode
      />
    );
  }

  const { prisma } = await import("@/lib/db");

  const [weapons, categories, gadgets, grenades] = await Promise.all([
    prisma.weapon.findMany({
      include: { category: true },
      orderBy: [{ category: { name: "asc" } }, { price: "asc" }, { name: "asc" }],
    }),
    prisma.weaponCategory.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.gadget.findMany({
      include: { category: true },
      orderBy: [{ price: "asc" }, { name: "asc" }],
    }),
    prisma.grenade.findMany({
      include: { category: true },
      orderBy: [{ price: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <LoadoutsPageClient
      initialWeapons={weapons}
      initialCategories={categories}
      initialGadgets={gadgets}
      initialGrenades={grenades}
    />
  );
}

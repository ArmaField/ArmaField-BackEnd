import {
  TEST_CATEGORIES,
  TEST_WEAPONS,
  TEST_GADGETS,
  TEST_GRENADES,
  TEST_ATTACHMENTS,
  TEST_WEAPON_ATTACHMENTS,
} from "@/lib/test-loadout-data";

/**
 * Idempotent seed: built-in roles, default backup settings, and default loadout data.
 * Safe to run multiple times - uses upsert everywhere.
 */
export async function runAdminSeed() {
  const { prisma } = await import("@/lib/db");

  // ─── Roles ──────────────────────────────
  const allPermissions = [
    "dashboard.view",
    "servers.view", "servers.manage",
    "loadouts.view", "loadouts.manage",
    "players.view", "players.manage",
    "users.view", "users.manage",
    "roles.manage",
    "logs.view",
    "backups.view", "backups.manage",
    "system.view",
  ];

  await prisma.role.upsert({
    where: { name: "Super Admin" },
    update: { permissions: allPermissions },
    create: {
      name: "Super Admin",
      color: "#ef4444",
      isBuiltIn: true,
      sortOrder: 0,
      permissions: allPermissions,
    },
  });

  await prisma.role.upsert({
    where: { name: "Admin" },
    update: {},
    create: {
      name: "Admin",
      color: "#f97316",
      isBuiltIn: false,
      sortOrder: 1,
      permissions: [
        "dashboard.view",
        "servers.view", "servers.manage",
        "loadouts.view", "loadouts.manage",
        "players.view", "players.manage",
        "users.view",
        "logs.view",
      ],
    },
  });

  await prisma.role.upsert({
    where: { name: "Tech Admin" },
    update: {},
    create: {
      name: "Tech Admin",
      color: "#3b82f6",
      isBuiltIn: false,
      sortOrder: 2,
      permissions: ["dashboard.view", "players.view", "logs.view"],
    },
  });

  // ─── Backup settings ────────────────────
  await prisma.setting.upsert({
    where: { key: "backup.schedule" },
    update: {},
    create: { key: "backup.schedule", value: "0 3 * * *" },
  });
  await prisma.setting.upsert({
    where: { key: "backup.retention.daily" },
    update: {},
    create: { key: "backup.retention.daily", value: "7" },
  });
  await prisma.setting.upsert({
    where: { key: "backup.retention.weekly" },
    update: {},
    create: { key: "backup.retention.weekly", value: "4" },
  });

  // ─── Categories ─────────────────────────
  const categoryIdByName = new Map<string, string>();
  for (const cat of TEST_CATEGORIES) {
    const row = await prisma.weaponCategory.upsert({
      where: { name: cat.name },
      update: { color: cat.color },
      create: { name: cat.name, color: cat.color },
      select: { id: true, name: true },
    });
    categoryIdByName.set(row.name, row.id);
  }

  // ─── Attachments (unique by guid) ───────
  const attachmentIdByGuid = new Map<string, string>();
  for (const att of TEST_ATTACHMENTS) {
    const row = await prisma.attachment.upsert({
      where: { guid: att.guid },
      update: { name: att.name, defaultPrice: att.defaultPrice, slot: att.slot },
      create: { guid: att.guid, name: att.name, defaultPrice: att.defaultPrice, slot: att.slot },
      select: { id: true, guid: true },
    });
    attachmentIdByGuid.set(row.guid, row.id);
  }

  // ─── Weapons (unique by [guid, class]) ──
  // Map test weaponId → actual DB weaponId (for bindings below)
  const weaponIdByTestId = new Map<string, string>();
  for (const w of TEST_WEAPONS) {
    const categoryId = categoryIdByName.get(w.category.name);
    if (!categoryId) continue;

    const row = await prisma.weapon.upsert({
      where: { guid_class: { guid: w.guid, class: w.class } },
      update: {
        name: w.name,
        price: w.price,
        zorder: w.zorder,
        isDefault: w.isDefault,
        type: w.type,
        categoryId,
      },
      create: {
        guid: w.guid,
        name: w.name,
        price: w.price,
        zorder: w.zorder,
        isDefault: w.isDefault,
        type: w.type,
        class: w.class,
        categoryId,
      },
      select: { id: true },
    });
    weaponIdByTestId.set(w.id, row.id);
  }

  // ─── Weapon ↔ Attachment bindings ───────
  for (const [testWeaponId, bindings] of Object.entries(TEST_WEAPON_ATTACHMENTS)) {
    const weaponId = weaponIdByTestId.get(testWeaponId);
    if (!weaponId) continue;

    for (const b of bindings) {
      const attachmentId = attachmentIdByGuid.get(b.attachment.guid);
      if (!attachmentId) continue;

      await prisma.weaponAttachment.upsert({
        where: { weaponId_attachmentId: { weaponId, attachmentId } },
        update: { priceOverride: b.priceOverride, isDefault: b.isDefault },
        create: { weaponId, attachmentId, priceOverride: b.priceOverride, isDefault: b.isDefault },
      });
    }
  }

  // ─── Gadgets (unique by [guid, class]) ──
  for (const g of TEST_GADGETS) {
    const categoryId = g.category ? categoryIdByName.get(g.category.name) ?? null : null;
    await prisma.gadget.upsert({
      where: { guid_class: { guid: g.guid, class: g.class } },
      update: { name: g.name, price: g.price, zorder: g.zorder, isDefault: g.isDefault, categoryId },
      create: {
        guid: g.guid,
        name: g.name,
        price: g.price,
        zorder: g.zorder,
        isDefault: g.isDefault,
        class: g.class,
        categoryId,
      },
    });
  }

  // ─── Grenades (unique by [guid, class]) ─
  for (const g of TEST_GRENADES) {
    const categoryId = g.category ? categoryIdByName.get(g.category.name) ?? null : null;
    await prisma.grenade.upsert({
      where: { guid_class: { guid: g.guid, class: g.class } },
      update: { name: g.name, price: g.price, zorder: g.zorder, isDefault: g.isDefault, categoryId },
      create: {
        guid: g.guid,
        name: g.name,
        price: g.price,
        zorder: g.zorder,
        isDefault: g.isDefault,
        class: g.class,
        categoryId,
      },
    });
  }
}

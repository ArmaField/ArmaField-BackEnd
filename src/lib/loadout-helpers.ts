import { Class, WeaponType, AttachmentSlot } from "@prisma/client";

export const CLASS_MAP: Record<number, Class> = { 1: "ASSAULT", 2: "ENGINEER", 3: "SUPPORT", 4: "RECON" };
export const CLASS_TO_INT: Record<string, number> = { ASSAULT: 1, ENGINEER: 2, SUPPORT: 3, RECON: 4 };
export const WEAPON_TYPE_MAP: Record<number, WeaponType> = { 1: "PRIMARY", 2: "SECONDARY", 3: "SPECIAL" };
export const SLOT_TO_INT: Record<string, number> = {
  OPTIC: 1,
  UNDER_BARREL: 2,
  HAND_GUARD: 3,
  MUZZLE: 4,
  STOCK: 5,
  MAGAZINE: 6,
};
export const INT_TO_SLOT: Record<number, AttachmentSlot> = {
  1: "OPTIC",
  2: "UNDER_BARREL",
  3: "HAND_GUARD",
  4: "MUZZLE",
  5: "STOCK",
  6: "MAGAZINE",
};

type WeaponSlot = { guid: string; price: number; attachments: { type: number; guid: string; price: number }[] } | null;

export type LoadoutEntry = {
  classId: number;
  primary: WeaponSlot;
  secondary: WeaponSlot;
  special: WeaponSlot;
  gadget: string | null;
  grenade: string | null;
};

/**
 * Build loadouts for a player. If `classFilter` is provided, only that class is returned.
 */
export async function buildLoadouts(
  prisma: any,
  playerId: string,
  classFilter?: Class
): Promise<LoadoutEntry[]> {
  const playerLoadouts = await prisma.playerLoadout.findMany({
    where: { playerId, ...(classFilter ? { class: classFilter } : {}) },
    orderBy: { class: "asc" },
  });

  const loadoutWeaponIds: string[] = [];
  for (const lo of playerLoadouts) {
    if (lo.weaponId) loadoutWeaponIds.push(lo.weaponId);
    if (lo.pistolId) loadoutWeaponIds.push(lo.pistolId);
    if (lo.specialId) loadoutWeaponIds.push(lo.specialId);
  }

  const weaponSetups = loadoutWeaponIds.length > 0
    ? await prisma.playerWeaponSetup.findMany({
        where: { playerId, weaponId: { in: loadoutWeaponIds } },
        include: { attachments: true },
      })
    : [];

  const allAttachmentIds = new Set<string>();
  for (const setup of weaponSetups) {
    for (const a of setup.attachments) allAttachmentIds.add(a.attachmentId);
  }

  const attachmentRows = allAttachmentIds.size > 0
    ? await prisma.attachment.findMany({
        where: { id: { in: Array.from(allAttachmentIds) } },
        select: { id: true, guid: true, slot: true, defaultPrice: true },
      })
    : [];

  const attInfoMap = new Map<string, { type: number; guid: string; price: number }>(
    attachmentRows.map((a: any) => [a.id, { type: SLOT_TO_INT[a.slot] ?? 0, guid: a.guid, price: a.defaultPrice }])
  );

  type AttEntry = { type: number; guid: string; price: number };

  const setupEquippedMap = new Map<string, AttEntry[]>();
  const setupSlotMap = new Map<string, Set<number>>();
  for (const setup of weaponSetups) {
    const equipped = setup.attachments
      .map((a: any) => attInfoMap.get(a.attachmentId))
      .filter(Boolean) as AttEntry[];
    setupEquippedMap.set(setup.weaponId, equipped);
    setupSlotMap.set(setup.weaponId, new Set(equipped.map((e) => e.type)));
  }

  const allWeaponIds = new Set<string>();
  const allGadgetIds = new Set<string>();
  const allGrenadeIds = new Set<string>();
  for (const lo of playerLoadouts) {
    if (lo.weaponId) allWeaponIds.add(lo.weaponId);
    if (lo.pistolId) allWeaponIds.add(lo.pistolId);
    if (lo.specialId) allWeaponIds.add(lo.specialId);
    if (lo.gadgetId) allGadgetIds.add(lo.gadgetId);
    if (lo.grenadeId) allGrenadeIds.add(lo.grenadeId);
  }

  const [weapons, gadgets, grenades] = await Promise.all([
    allWeaponIds.size > 0
      ? prisma.weapon.findMany({ where: { id: { in: Array.from(allWeaponIds) } }, select: { id: true, guid: true, price: true } })
      : [],
    allGadgetIds.size > 0
      ? prisma.gadget.findMany({ where: { id: { in: Array.from(allGadgetIds) } }, select: { id: true, guid: true } })
      : [],
    allGrenadeIds.size > 0
      ? prisma.grenade.findMany({ where: { id: { in: Array.from(allGrenadeIds) } }, select: { id: true, guid: true } })
      : [],
  ]);

  const weaponInfoMap = new Map<string, { guid: string; price: number }>(
    weapons.map((w: any) => [w.id, { guid: w.guid, price: w.price }])
  );
  const gadgetGuidMap = new Map<string, string>(gadgets.map((g: any) => [g.id, g.guid]));
  const grenadeGuidMap = new Map<string, string>(grenades.map((g: any) => [g.id, g.guid]));

  // All slots per weapon (for empty slot markers)
  const allWeaponBindings = loadoutWeaponIds.length > 0
    ? await prisma.weaponAttachment.findMany({
        where: { weaponId: { in: loadoutWeaponIds } },
        include: { attachment: { select: { slot: true } } },
      })
    : [];
  const allSlotsPerWeapon = new Map<string, Set<number>>();
  for (const b of allWeaponBindings) {
    const slotInt = SLOT_TO_INT[b.attachment.slot] ?? 0;
    const existing = allSlotsPerWeapon.get(b.weaponId) ?? new Set();
    existing.add(slotInt);
    allSlotsPerWeapon.set(b.weaponId, existing);
  }

  function buildWeaponSlot(weaponId: string | null) {
    if (!weaponId) return null;
    const info = weaponInfoMap.get(weaponId);
    if (!info) return null;

    const hasSetup = setupEquippedMap.has(weaponId);
    if (!hasSetup) {
      return { guid: info.guid, price: info.price, attachments: [] };
    }

    const equipped = setupEquippedMap.get(weaponId) ?? [];
    const equippedSlots = setupSlotMap.get(weaponId) ?? new Set();
    const allSlots = allSlotsPerWeapon.get(weaponId) ?? new Set();

    const attachments: AttEntry[] = [...equipped];
    for (const slotType of allSlots) {
      if (!equippedSlots.has(slotType)) {
        attachments.push({ type: slotType, guid: "", price: 0 });
      }
    }
    return { guid: info.guid, price: info.price, attachments };
  }

  const classOrder: Class[] = classFilter ? [classFilter] : ["ASSAULT", "ENGINEER", "SUPPORT", "RECON"];
  interface LoadoutRow {
    class: string;
    weaponId: string | null;
    pistolId: string | null;
    specialId: string | null;
    gadgetId: string | null;
    grenadeId: string | null;
  }
  const loadoutMap = new Map<string, LoadoutRow>(playerLoadouts.map((lo: LoadoutRow) => [lo.class, lo]));

  return classOrder.map((cls) => {
    const lo = loadoutMap.get(cls);
    if (!lo) {
      return { classId: CLASS_TO_INT[cls], primary: null, secondary: null, special: null, gadget: null, grenade: null };
    }
    return {
      classId: CLASS_TO_INT[cls],
      primary: buildWeaponSlot(lo.weaponId),
      secondary: buildWeaponSlot(lo.pistolId),
      special: buildWeaponSlot(lo.specialId),
      gadget: lo.gadgetId ? (gadgetGuidMap.get(lo.gadgetId) ?? null) : null,
      grenade: lo.grenadeId ? (grenadeGuidMap.get(lo.grenadeId) ?? null) : null,
    };
  });
}

type AttInfo = { type: number; guid: string; price: number };

/**
 * Build items list for a given class + item type. Mirrors GET /api/items logic.
 * itemType: 1=PRIMARY, 2=SECONDARY, 3=SPECIAL, 4=GADGET, 5=GRENADE
 */
export async function buildItemsList(
  prisma: any,
  playerId: string,
  cls: Class,
  itemType: number
): Promise<{ guid: string; price: number; attachments: AttInfo[] | null }[]> {
  const weaponType = WEAPON_TYPE_MAP[itemType];

  if (weaponType) {
    const weapons = await prisma.weapon.findMany({
      where: { class: cls, type: weaponType },
      select: { id: true, guid: true, price: true, zorder: true },
      orderBy: { zorder: "asc" },
    });

    const ownedUnlocks = await prisma.playerUnlock.findMany({
      where: { playerId, itemType: "WEAPON", itemId: { in: weapons.map((w: any) => w.id) } },
      select: { itemId: true },
    });
    const ownedIds = new Set(ownedUnlocks.map((u: any) => u.itemId));

    const allWeaponIds = weapons.map((w: any) => w.id);
    const setups = allWeaponIds.length > 0
      ? await prisma.playerWeaponSetup.findMany({
          where: { playerId, weaponId: { in: allWeaponIds } },
          include: { attachments: true },
        })
      : [];

    const allBindings = await prisma.weaponAttachment.findMany({
      where: { weaponId: { in: allWeaponIds } },
      select: { weaponId: true, attachmentId: true, priceOverride: true, isDefault: true },
    });

    const allAttIds = new Set<string>();
    for (const s of setups) for (const a of s.attachments) allAttIds.add(a.attachmentId);
    for (const b of allBindings) allAttIds.add(b.attachmentId);

    const attRows = allAttIds.size > 0
      ? await prisma.attachment.findMany({
          where: { id: { in: Array.from(allAttIds) } },
          select: { id: true, guid: true, slot: true, defaultPrice: true },
        })
      : [];
    const attInfoMap = new Map<string, { type: number; guid: string; defaultPrice: number }>(
      attRows.map((a: any) => [a.id, { type: SLOT_TO_INT[a.slot] ?? 0, guid: a.guid, defaultPrice: a.defaultPrice }])
    );

    const ownedAttUnlocks = allAttIds.size > 0
      ? await prisma.playerWeaponAttachmentUnlock.findMany({
          where: { playerId, weaponId: { in: allWeaponIds }, attachmentId: { in: Array.from(allAttIds) } },
          select: { weaponId: true, attachmentId: true },
        })
      : [];
    const ownedAttComposite = new Set(
      ownedAttUnlocks.map((u: any) => `${u.weaponId}:${u.attachmentId}`)
    );

    const setupEquippedIds = new Map<string, Set<string>>();
    for (const s of setups) {
      setupEquippedIds.set(s.weaponId, new Set(s.attachments.map((a: any) => a.attachmentId)));
    }

    const weaponBindings = new Map<string, typeof allBindings>();
    for (const b of allBindings) {
      const list = weaponBindings.get(b.weaponId) ?? [];
      list.push(b);
      weaponBindings.set(b.weaponId, list);
    }

    const mapped = weapons.map((w: any) => {
      const owned = ownedIds.has(w.id) || w.price === 0;
      const bindings = weaponBindings.get(w.id) ?? [];
      const equippedSet = setupEquippedIds.get(w.id);
      const hasSetup = !!equippedSet;

      const bySlot = new Map<number, typeof allBindings>();
      for (const b of bindings) {
        const info = attInfoMap.get(b.attachmentId);
        if (!info) continue;
        const list = bySlot.get(info.type) ?? [];
        list.push(b);
        bySlot.set(info.type, list);
      }

      const attachments: AttInfo[] = [];
      for (const [slotType, slotBindings] of bySlot) {
        let chosen: any;
        if (hasSetup) {
          chosen = slotBindings.find((b: any) => equippedSet!.has(b.attachmentId));
        } else {
          chosen = slotBindings.find((b: any) => b.isDefault);
        }
        if (!chosen) {
          attachments.push({ type: slotType, guid: "", price: 0 });
          continue;
        }
        const info = attInfoMap.get(chosen.attachmentId)!;
        const originalPrice = chosen.priceOverride ?? info.defaultPrice;
        const attOwned = ownedAttComposite.has(`${w.id}:${chosen.attachmentId}`) || originalPrice === 0;
        attachments.push({ type: slotType, guid: info.guid, price: attOwned ? 0 : originalPrice });
      }

      return { guid: w.guid, price: owned ? 0 : w.price, attachments, _zorder: w.zorder };
    });

    mapped.sort((a: any, b: any) => {
      const aUnlocked = a.price === 0 ? 0 : 1;
      const bUnlocked = b.price === 0 ? 0 : 1;
      if (aUnlocked !== bUnlocked) return aUnlocked - bUnlocked;
      return a._zorder - b._zorder;
    });

    return mapped.map(({ _zorder, ...rest }: any) => rest);
  }

  // GADGET or GRENADE
  const table = itemType === 4 ? "gadget" : "grenade";
  const unlockType = itemType === 4 ? "GADGET" : "GRENADE";

  const items = await prisma[table].findMany({
    where: { class: cls },
    select: { id: true, guid: true, price: true, zorder: true },
    orderBy: { zorder: "asc" },
  });

  const ownedUnlocks = await prisma.playerUnlock.findMany({
    where: { playerId, itemType: unlockType, itemId: { in: items.map((g: any) => g.id) } },
    select: { itemId: true },
  });
  const ownedIds = new Set(ownedUnlocks.map((u: any) => u.itemId));

  const mapped = items.map((g: any) => ({
    guid: g.guid,
    price: (ownedIds.has(g.id) || g.price === 0) ? 0 : g.price,
    attachments: null,
    _zorder: g.zorder,
  }));

  mapped.sort((a: any, b: any) => {
    const aUnlocked = a.price === 0 ? 0 : 1;
    const bUnlocked = b.price === 0 ? 0 : 1;
    if (aUnlocked !== bUnlocked) return aUnlocked - bUnlocked;
    return a._zorder - b._zorder;
  });

  return mapped.map(({ _zorder, ...rest }: any) => rest);
}

/**
 * Build attachments list for a specific weapon. Mirrors GET /api/attachments logic.
 */
export async function buildAttachmentsList(
  prisma: any,
  playerId: string,
  weaponId: string
): Promise<AttInfo[]> {
  const bindings = await prisma.weaponAttachment.findMany({
    where: { weaponId },
    include: { attachment: true },
  });

  const attachmentIds = bindings.map((b: any) => b.attachmentId);
  const ownedUnlocks = attachmentIds.length > 0
    ? await prisma.playerWeaponAttachmentUnlock.findMany({
        where: { playerId, weaponId, attachmentId: { in: attachmentIds } },
        select: { attachmentId: true },
      })
    : [];
  const ownedIds = new Set(ownedUnlocks.map((u: any) => u.attachmentId));

  const attachments = bindings.map((b: any) => {
    const originalPrice = b.priceOverride ?? b.attachment.defaultPrice;
    const owned = ownedIds.has(b.attachmentId) || originalPrice === 0;
    return {
      type: SLOT_TO_INT[b.attachment.slot] ?? 0,
      guid: b.attachment.guid,
      price: owned ? 0 : originalPrice,
      _originalPrice: originalPrice,
      _name: b.attachment.name,
    };
  });

  attachments.sort((a: any, b: any) => {
    const aUnlocked = a.price === 0 ? 0 : 1;
    const bUnlocked = b.price === 0 ? 0 : 1;
    if (aUnlocked !== bUnlocked) return aUnlocked - bUnlocked;
    if (a._originalPrice !== b._originalPrice) return a._originalPrice - b._originalPrice;
    return a._name.localeCompare(b._name);
  });

  return attachments.map(({ _originalPrice, _name, ...rest }: any) => rest);
}

import {
  TEST_WEAPONS,
  TEST_GADGETS,
  TEST_GRENADES,
  TEST_WEAPON_ATTACHMENTS,
} from "@/lib/test-loadout-data";
import { CLASS_TO_INT, SLOT_TO_INT, WEAPON_TYPE_MAP } from "@/lib/loadout-helpers";

type Class = "ASSAULT" | "ENGINEER" | "SUPPORT" | "RECON";
type WeaponType = "PRIMARY" | "SECONDARY" | "SPECIAL";

/**
 * Stateless helpers that mirror the shape of `loadout-helpers.ts` but build
 * responses from the static TEST_* data. No database access whatsoever.
 *
 * In test mode every player gets the default loadout on every call.
 * xp is always 0, purchases/stats/loadout changes are no-ops.
 */

type AttInfo = { type: number; guid: string; price: number };

function attachmentsForWeapon(weaponId: string, onlyDefault: boolean): AttInfo[] {
  const bindings = TEST_WEAPON_ATTACHMENTS[weaponId] ?? [];
  const filtered = onlyDefault ? bindings.filter((b) => b.isDefault) : bindings;

  // For each slot: if we have an attachment (default or equipped), include it.
  // Otherwise include empty slot marker.
  const bySlot = new Map<number, AttInfo>();
  for (const b of bindings) {
    const slotInt = SLOT_TO_INT[b.attachment.slot] ?? 0;
    if (!bySlot.has(slotInt)) {
      bySlot.set(slotInt, { type: slotInt, guid: "", price: 0 });
    }
  }
  for (const b of filtered) {
    const slotInt = SLOT_TO_INT[b.attachment.slot] ?? 0;
    bySlot.set(slotInt, {
      type: slotInt,
      guid: b.attachment.guid,
      price: b.priceOverride ?? b.attachment.defaultPrice,
    });
  }
  return Array.from(bySlot.values());
}

function defaultWeaponSlot(cls: Class, type: WeaponType) {
  const w = TEST_WEAPONS.find((x) => x.class === cls && x.type === type && x.isDefault);
  if (!w) return null;
  return {
    guid: w.guid,
    price: 0,
    attachments: attachmentsForWeapon(w.id, true),
  };
}

export function buildTestLoadouts(classFilter?: Class) {
  const classes: Class[] = classFilter ? [classFilter] : ["ASSAULT", "ENGINEER", "SUPPORT", "RECON"];

  return classes.map((cls) => {
    const defaultGadget = TEST_GADGETS.find((g) => g.class === cls && g.isDefault);
    const defaultGrenade = TEST_GRENADES.find((g) => g.class === cls && g.isDefault);

    return {
      classId: CLASS_TO_INT[cls],
      primary: defaultWeaponSlot(cls, "PRIMARY"),
      secondary: defaultWeaponSlot(cls, "SECONDARY"),
      special: defaultWeaponSlot(cls, "SPECIAL"),
      gadget: defaultGadget?.guid ?? null,
      grenade: defaultGrenade?.guid ?? null,
    };
  });
}

export function buildTestItemsList(cls: Class, itemType: number) {
  const weaponType = WEAPON_TYPE_MAP[itemType];

  if (weaponType) {
    const weapons = TEST_WEAPONS
      .filter((w) => w.class === cls && w.type === weaponType)
      .sort((a, b) => a.zorder - b.zorder);

    return weapons.map((w) => ({
      guid: w.guid,
      price: w.price,
      attachments: attachmentsForWeapon(w.id, false),
    }));
  }

  if (itemType === 4) {
    return TEST_GADGETS
      .filter((g) => g.class === cls)
      .sort((a, b) => a.zorder - b.zorder)
      .map((g) => ({ guid: g.guid, price: g.price, attachments: null }));
  }

  if (itemType === 5) {
    return TEST_GRENADES
      .filter((g) => g.class === cls)
      .sort((a, b) => a.zorder - b.zorder)
      .map((g) => ({ guid: g.guid, price: g.price, attachments: null }));
  }

  return [];
}

export function buildTestAttachmentsList(weaponGuid: string): AttInfo[] {
  // Find any weapon matching this guid (guid may be shared across classes)
  const weapon = TEST_WEAPONS.find((w) => w.guid === weaponGuid);
  if (!weapon) return [];
  return attachmentsForWeapon(weapon.id, false);
}


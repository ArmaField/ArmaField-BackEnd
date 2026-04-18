export const CLASSES = ["ASSAULT", "ENGINEER", "SUPPORT", "RECON"] as const;
export type Class = (typeof CLASSES)[number];

export interface WeaponCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface Weapon {
  id: string;
  guid: string;
  name: string;
  price: number;
  zorder: number;
  isDefault: boolean;
  type: "PRIMARY" | "SECONDARY" | "SPECIAL";
  class: Class;
  categoryId: string;
  category: WeaponCategory;
}


export const ATTACHMENT_SLOTS = ["OPTIC", "UNDER_BARREL", "HAND_GUARD", "MUZZLE", "STOCK", "MAGAZINE"] as const;
export type AttachmentSlot = (typeof ATTACHMENT_SLOTS)[number];

export interface Attachment {
  id: string;
  guid: string;
  name: string;
  defaultPrice: number;
  slot: AttachmentSlot;
}

export interface WeaponAttachmentBinding {
  weaponId: string;
  attachmentId: string;
  priceOverride: number | null;
  isDefault: boolean;
  attachment: Attachment;
}

export interface Gadget {
  id: string;
  guid: string;
  name: string;
  price: number;
  zorder: number;
  isDefault: boolean;
  class: Class;
  categoryId: string | null;
  category: WeaponCategory | null;
}

export interface Grenade {
  id: string;
  guid: string;
  name: string;
  price: number;
  zorder: number;
  isDefault: boolean;
  class: Class;
  categoryId: string | null;
  category: WeaponCategory | null;
}

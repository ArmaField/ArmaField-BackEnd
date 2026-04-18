import type {
  Weapon,
  WeaponCategory,
  Gadget,
  Grenade,
  Attachment,
  WeaponAttachmentBinding,
  Class,
  AttachmentSlot,
} from "@/components/admin/loadouts/types";

// ─── Categories ─────────────────────────────────

const CAT_AR: WeaponCategory = { id: "cat-assault-rifle", name: "Assault Rifle", icon: null, color: "#ED2100" };
const CAT_EXPLOSIVES: WeaponCategory = { id: "cat-explosives", name: "Explosives", icon: null, color: "#FFCE1B" };
const CAT_GRENADE: WeaponCategory = { id: "cat-grenade", name: "Grenade", icon: null, color: "#E35336" };
const CAT_LAUNCHER: WeaponCategory = { id: "cat-launcher", name: "Launcher", icon: null, color: "#FFB343" };
const CAT_LMG: WeaponCategory = { id: "cat-lmg", name: "Light Machine Gun", icon: null, color: "#678DC6" };
const CAT_MG: WeaponCategory = { id: "cat-mg", name: "Machine Gun", icon: null, color: "#1A4A96" };
const CAT_MINE: WeaponCategory = { id: "cat-mine", name: "Mine", icon: null, color: "#FF5C00" };
const CAT_PISTOL: WeaponCategory = { id: "cat-pistol", name: "Pistol", icon: null, color: "#6b7280" };
const CAT_SMOKE: WeaponCategory = { id: "cat-smoke", name: "Smoke Grenade", icon: null, color: "#6A89A7" };
const CAT_SNIPER: WeaponCategory = { id: "cat-sniper", name: "Sniper Rifle", icon: null, color: "#50C878" };

export const TEST_CATEGORIES: WeaponCategory[] = [
  CAT_AR, CAT_EXPLOSIVES, CAT_GRENADE, CAT_LAUNCHER, CAT_LMG, CAT_MG, CAT_MINE, CAT_PISTOL, CAT_SMOKE, CAT_SNIPER,
];

// ─── Weapons ───────────────────────────────────

const weapon = (
  id: string,
  guid: string,
  name: string,
  price: number,
  zorder: number,
  isDefault: boolean,
  type: "PRIMARY" | "SECONDARY" | "SPECIAL",
  cls: Class,
  category: WeaponCategory,
): Weapon => ({ id, guid, name, price, zorder, isDefault, type, class: cls, categoryId: category.id, category });

export const TEST_WEAPONS: Weapon[] = [
  // ── ASSAULT ──
  weapon("w-ak74-assault", "FA5C25BF66A53DCF", "AK-74", 0, 1, true, "PRIMARY", "ASSAULT", CAT_AR),
  weapon("w-m16a2-assault", "3E413771E1834D2F", "M16A2", 0, 2, false, "PRIMARY", "ASSAULT", CAT_AR),
  weapon("w-m16a2-m203-assault", "5A987A8A13763769", "M16A2 + M203", 1600, 3, false, "PRIMARY", "ASSAULT", CAT_AR),
  weapon("w-vz58-assault", "9C948630078D154D", "VZ 58", 1500, 4, false, "PRIMARY", "ASSAULT", CAT_AR),
  weapon("w-ak74n-assault", "96DFD2E7E63B3386", "AK-74N", 4000, 5, false, "PRIMARY", "ASSAULT", CAT_AR),
  weapon("w-pm-assault", "C0F7DD85A86B2900", "PM", 0, 1, true, "SECONDARY", "ASSAULT", CAT_PISTOL),
  weapon("w-m9-assault", "1353C6EAD1DCFE43", "M9", 500, 2, false, "SECONDARY", "ASSAULT", CAT_PISTOL),

  // ── ENGINEER ──
  weapon("w-aks74u-engineer", "BFEA719491610A45", "AKS-74U", 0, 1, true, "PRIMARY", "ENGINEER", CAT_AR),
  weapon("w-aks74un-engineer", "FA0E25CE35EE945F", "AKS-74UN", 2000, 2, false, "PRIMARY", "ENGINEER", CAT_AR),
  weapon("w-m16a2-carabine-engineer", "F97A4AC994231900", "M16A2 Carabine", 4000, 3, false, "PRIMARY", "ENGINEER", CAT_AR),
  weapon("w-pm-engineer", "C0F7DD85A86B2900", "PM", 0, 1, true, "SECONDARY", "ENGINEER", CAT_PISTOL),
  weapon("w-m9-engineer", "1353C6EAD1DCFE43", "M9", 500, 2, false, "SECONDARY", "ENGINEER", CAT_PISTOL),
  weapon("w-m72-engineer", "9C5C20FB0E01E64F", "M72", 0, 1, true, "SPECIAL", "ENGINEER", CAT_LAUNCHER),
  weapon("w-rpg75-engineer", "7C45EC94C698246B", "RPG 75", 0, 2, false, "SPECIAL", "ENGINEER", CAT_LAUNCHER),
  weapon("w-rpg22-engineer", "722CE6FEC39EE896", "RPG 22", 0, 3, false, "SPECIAL", "ENGINEER", CAT_LAUNCHER),
  weapon("w-rpg7-engineer", "7A82FE978603F137", "RPG 7", 8000, 4, false, "SPECIAL", "ENGINEER", CAT_LAUNCHER),
  weapon("w-m15-engineer", "3BF82FD68BBC845C", "M15", 3000, 50, false, "SPECIAL", "ENGINEER", CAT_MINE),
  weapon("w-tm62m-engineer", "CCC00D009D4949B0", "TM-62M", 3000, 51, false, "SPECIAL", "ENGINEER", CAT_MINE),

  // ── SUPPORT ──
  weapon("w-m249-support", "D2B48DEBEF38D7D7", "M249", 0, 1, true, "PRIMARY", "SUPPORT", CAT_MG),
  weapon("w-pkm-support", "A89BC9D55FFB4CD8", "PKM", 0, 2, false, "PRIMARY", "SUPPORT", CAT_MG),
  weapon("w-uk59-support", "026CE108BFB3EC03", "UK 59", 2000, 3, false, "PRIMARY", "SUPPORT", CAT_MG),
  weapon("w-m60-support", "D182DCDD72BF7E34", "M60", 3000, 4, false, "PRIMARY", "SUPPORT", CAT_MG),
  weapon("w-pkmn-support", "80CBC9A8D95A8A7B", "PKMN", 6000, 5, false, "PRIMARY", "SUPPORT", CAT_MG),
  weapon("w-rpk74-support", "A7AF84C6C58BA3E8", "RPK-74", 1500, 50, false, "PRIMARY", "SUPPORT", CAT_LMG),
  weapon("w-rpk74n-support", "5F365605E36597FB", "RPK-74N", 4000, 51, false, "PRIMARY", "SUPPORT", CAT_LMG),
  weapon("w-pm-support", "C0F7DD85A86B2900", "PM", 0, 1, true, "SECONDARY", "SUPPORT", CAT_PISTOL),
  weapon("w-m9-support", "1353C6EAD1DCFE43", "M9", 500, 2, false, "SECONDARY", "SUPPORT", CAT_PISTOL),

  // ── RECON ──
  weapon("w-m21-recon", "B31929F65F0D0279", "M21", 0, 1, true, "PRIMARY", "RECON", CAT_SNIPER),
  weapon("w-m21camo-recon", "8D6553BEAF8640D1", "M21 Camo", 2000, 2, false, "PRIMARY", "RECON", CAT_SNIPER),
  weapon("w-svd-recon", "3EB02CDAD5F23C82", "SVD", 4000, 3, false, "PRIMARY", "RECON", CAT_SNIPER),
  weapon("w-pm-recon", "C0F7DD85A86B2900", "PM", 0, 1, true, "SECONDARY", "RECON", CAT_PISTOL),
  weapon("w-m9-recon", "1353C6EAD1DCFE43", "M9", 500, 2, false, "SECONDARY", "RECON", CAT_PISTOL),
];

// ─── Gadgets ───────────────────────────────────

const gadget = (
  id: string,
  guid: string,
  name: string,
  price: number,
  zorder: number,
  isDefault: boolean,
  cls: Class,
): Gadget => ({ id, guid, name, price, zorder, isDefault, class: cls, categoryId: null, category: null });

export const TEST_GADGETS: Gadget[] = [
  gadget("g-medkit-assault", "84215EB8AF53C91C", "MedKit", 0, 1, true, "ASSAULT"),
  gadget("g-repairkit-engineer", "33B2DFDCD0EBA3DB", "Repair Kit", 0, 1, true, "ENGINEER"),
  gadget("g-ammobag-support", "831A42E7BBB27877", "Ammo Bag", 0, 1, true, "SUPPORT"),
];

// ─── Grenades ──────────────────────────────────

const grenade = (
  id: string,
  guid: string,
  name: string,
  price: number,
  zorder: number,
  isDefault: boolean,
  cls: Class,
  category: WeaponCategory | null,
): Grenade => ({
  id,
  guid,
  name,
  price,
  zorder,
  isDefault,
  class: cls,
  categoryId: category?.id ?? null,
  category,
});

export const TEST_GRENADES: Grenade[] = [
  // ── ASSAULT ──
  grenade("gr-rgd5-assault", "645C73791ECA1698", "RGD-5", 0, 1, true, "ASSAULT", CAT_GRENADE),
  grenade("gr-m67-assault", "E8F00BF730225B00", "M67", 900, 2, false, "ASSAULT", CAT_GRENADE),
  grenade("gr-rdg2-assault", "77EAE5E07DC4678A", "RDG-2", 0, 50, false, "ASSAULT", CAT_SMOKE),
  grenade("gr-anm8-assault", "9DB69176CEF0EE97", "AN-M8", 300, 51, false, "ASSAULT", CAT_SMOKE),
  grenade("gr-m18green-assault", "D41D22DD1B8E921E", "M18 Green", 600, 52, false, "ASSAULT", CAT_SMOKE),
  grenade("gr-m18red-assault", "3343A055A83CB30D", "M18 Red", 600, 53, false, "ASSAULT", CAT_SMOKE),
  grenade("gr-m18violet-assault", "14C1A0F061D9DDEE", "M18 Violet", 600, 54, false, "ASSAULT", CAT_SMOKE),
  grenade("gr-m18yellow-assault", "9BBDEE253A16CC66", "M18 Yellow", 600, 55, false, "ASSAULT", CAT_SMOKE),

  // ── ENGINEER ──
  grenade("gr-rgd5-engineer", "645C73791ECA1698", "RGD-5", 0, 1, true, "ENGINEER", CAT_GRENADE),
  grenade("gr-m67-engineer", "E8F00BF730225B00", "M67", 900, 2, false, "ENGINEER", CAT_GRENADE),

  // ── SUPPORT ──
  grenade("gr-rgd5-support", "645C73791ECA1698", "RGD-5", 0, 1, true, "SUPPORT", CAT_GRENADE),
  grenade("gr-m67-support", "E8F00BF730225B00", "M67", 900, 2, false, "SUPPORT", CAT_GRENADE),
  grenade("gr-tsh400-support", "97064F8597F2D7BF", "TSH400g", 3000, 50, false, "SUPPORT", CAT_EXPLOSIVES),
  grenade("gr-m112-support", "33CBDE73AB48172A", "M112", 3000, 51, false, "SUPPORT", CAT_EXPLOSIVES),

  // ── RECON ──
  grenade("gr-rgd5-recon", "645C73791ECA1698", "RGD-5", 0, 1, true, "RECON", CAT_GRENADE),
  grenade("gr-m67-recon", "E8F00BF730225B00", "M67", 900, 2, false, "RECON", CAT_GRENADE),
  grenade("gr-pmn4-recon", "B05A816C0BF50802", "PMN-4", 3000, 50, false, "RECON", CAT_MINE),
  grenade("gr-m14-recon", "E4C9F0A4090CFE4D", "M14", 3000, 51, false, "RECON", CAT_MINE),
];

// ─── Attachments ──────────────────────────────

const att = (id: string, guid: string, name: string, defaultPrice: number, slot: AttachmentSlot): Attachment =>
  ({ id, guid, name, defaultPrice, slot });

// OPTICs
const ATT_1P29 = att("att-1p29", "ACDF49FACD0701A8", "1P29", 300, "OPTIC");
const ATT_M16_4X20 = att("att-m16-4x20", "BD496EE1B40DC510", "M16 4x20", 450, "OPTIC");
const ATT_M16_AP2K = att("att-m16-ap2k", "08286DDBB1F33FF1", "M16 AP2k", 600, "OPTIC");
const ATT_M21_ARTII = att("att-m21-artii", "D2018EDB1BBF4C88", "M21 ARTII", 0, "OPTIC");
const ATT_M21_ARTII_CAMO = att("att-m21-artii-camo", "304664561B760EE0", "M21 ARTII Camo", 0, "OPTIC");
const ATT_PGO7V3 = att("att-pgo7v3", "E5E9DBBF3BFB88C6", "PGO-7V3", 900, "OPTIC");
const ATT_PSO1 = att("att-pso1", "C850A33226B8F9C1", "PSO-1", 0, "OPTIC");
const ATT_UK59_OPTIC = att("att-uk59-optic", "886A96EF3F14BCD2", "UK 59 Optic", 600, "OPTIC");

// UNDER_BARREL
const ATT_GP25 = att("att-gp25", "1ABABE3551512B0A", "GP-25", 1600, "UNDER_BARREL");

// HAND_GUARD
const ATT_M16CARB_HG_BASE = att("att-m16carb-hg-base", "20BCF441EAD9F593", "M16 Carabine Handguard Base", 0, "HAND_GUARD");
const ATT_M16CARB_HG_SOLID = att("att-m16carb-hg-solid", "85C85EFC8E49B312", "M16 Carabine Handguard Solid", 150, "HAND_GUARD");
const ATT_M16CARB_HG_STRIPES = att("att-m16carb-hg-stripes", "084D8EDB23D39D93", "M16 Carabine Handguard Stripes", 150, "HAND_GUARD");
const ATT_M16_HG_BASE = att("att-m16-hg-base", "FB1A7F5BC7D935E2", "M16 Handguard Base", 0, "HAND_GUARD");
const ATT_M16_HG_SOLID = att("att-m16-hg-solid", "51C19F66AAC90A29", "M16 Handguard Solid", 150, "HAND_GUARD");
const ATT_M16_HG_STRIPES = att("att-m16-hg-stripes", "1A2C3098A3F88658", "M16 Handguard Stripes", 150, "HAND_GUARD");

// MUZZLE
const ATT_AK74_FH = att("att-ak74-fh", "4A815EB8B824974A", "AK74 FlashHider", 0, "MUZZLE");
const ATT_AKS74U_FH = att("att-aks74u-fh", "06D4C36A6D585275", "AKS-74U FlashHider", 0, "MUZZLE");
const ATT_M16_FH = att("att-m16-fh", "6288A1F1A5E3AC37", "M16 FlashHider", 0, "MUZZLE");
const ATT_M16_SUPP = att("att-m16-supp", "E52C9791E1554A5F", "M16 Suppressor", 1500, "MUZZLE");
const ATT_PBS4 = att("att-pbs4", "3B96FAC169E27037", "PBS-4", 1500, "MUZZLE");

// STOCK
const ATT_VZ58_STOCK_FIXED = att("att-vz58-stock-fixed", "2F4BBE174AFAF5E0", "VZ58 Stock Fixed", 0, "STOCK");
const ATT_VZ58_STOCK_FOLDING = att("att-vz58-stock-folding", "AD045AFAFFC1AB6E", "VZ58 Stock Folding", 150, "STOCK");

// MAGAZINE
const ATT_MAG_AK74 = att("att-mag-ak74", "0A84AA5A3884176F", "AK 74", 0, "MAGAZINE");
const ATT_MAG_M16A2 = att("att-mag-m16a2", "D8F2CA92583B23D3", "M16A2", 0, "MAGAZINE");
const ATT_MAG_M21 = att("att-mag-m21", "627255315038152A", "M21", 0, "MAGAZINE");
const ATT_MAG_M249 = att("att-mag-m249", "06D722FC2666EB83", "M249", 0, "MAGAZINE");
const ATT_MAG_M60 = att("att-mag-m60", "4D2C1E8F3A81F894", "M60", 0, "MAGAZINE");
const ATT_MAG_M9 = att("att-mag-m9", "9C05543A503DB80E", "M9", 0, "MAGAZINE");
const ATT_MAG_PKM = att("att-mag-pkm", "E5E9C5897CF47F44", "PKM", 0, "MAGAZINE");
const ATT_MAG_PM = att("att-mag-pm", "8B853CDD11BA916E", "PM", 0, "MAGAZINE");
const ATT_MAG_RPK74 = att("att-mag-rpk74", "D78C667F59829717", "RPK 74", 0, "MAGAZINE");
const ATT_MAG_SVD = att("att-mag-svd", "9CCB46C6EE632C1A", "SVD", 0, "MAGAZINE");
const ATT_MAG_UK59 = att("att-mag-uk59", "03094E059B554A9C", "UK 59", 0, "MAGAZINE");
const ATT_MAG_VZ58 = att("att-mag-vz58", "A827B610B7CD4158", "VZ 58", 0, "MAGAZINE");

export const TEST_ATTACHMENTS: Attachment[] = [
  ATT_1P29, ATT_M16_4X20, ATT_M16_AP2K, ATT_M21_ARTII, ATT_M21_ARTII_CAMO, ATT_PGO7V3, ATT_PSO1, ATT_UK59_OPTIC,
  ATT_GP25,
  ATT_M16CARB_HG_BASE, ATT_M16CARB_HG_SOLID, ATT_M16CARB_HG_STRIPES,
  ATT_M16_HG_BASE, ATT_M16_HG_SOLID, ATT_M16_HG_STRIPES,
  ATT_AK74_FH, ATT_AKS74U_FH, ATT_M16_FH, ATT_M16_SUPP, ATT_PBS4,
  ATT_VZ58_STOCK_FIXED, ATT_VZ58_STOCK_FOLDING,
  ATT_MAG_AK74, ATT_MAG_M16A2, ATT_MAG_M21, ATT_MAG_M249, ATT_MAG_M60, ATT_MAG_M9, ATT_MAG_PKM, ATT_MAG_PM, ATT_MAG_RPK74, ATT_MAG_SVD, ATT_MAG_UK59, ATT_MAG_VZ58,
];

// ─── Weapon Attachment Bindings ──────────────

const bind = (
  weaponId: string,
  attachment: Attachment,
  isDefault: boolean,
): WeaponAttachmentBinding => ({
  weaponId,
  attachmentId: attachment.id,
  priceOverride: null,
  isDefault,
  attachment,
});

export const TEST_WEAPON_ATTACHMENTS: Record<string, WeaponAttachmentBinding[]> = {
  // ── ASSAULT PRIMARY ──
  "w-ak74-assault": [
    bind("w-ak74-assault", ATT_GP25, false),
    bind("w-ak74-assault", ATT_AK74_FH, true),
    bind("w-ak74-assault", ATT_PBS4, false),
    bind("w-ak74-assault", ATT_MAG_AK74, true),
  ],
  "w-ak74n-assault": [
    bind("w-ak74n-assault", ATT_1P29, false),
    bind("w-ak74n-assault", ATT_GP25, false),
    bind("w-ak74n-assault", ATT_AK74_FH, true),
    bind("w-ak74n-assault", ATT_PBS4, false),
    bind("w-ak74n-assault", ATT_MAG_AK74, true),
  ],
  "w-m16a2-assault": [
    bind("w-m16a2-assault", ATT_M16_4X20, false),
    bind("w-m16a2-assault", ATT_M16_AP2K, false),
    bind("w-m16a2-assault", ATT_M16_HG_BASE, true),
    bind("w-m16a2-assault", ATT_M16_HG_SOLID, false),
    bind("w-m16a2-assault", ATT_M16_HG_STRIPES, false),
    bind("w-m16a2-assault", ATT_M16_FH, true),
    bind("w-m16a2-assault", ATT_M16_SUPP, false),
    bind("w-m16a2-assault", ATT_MAG_M16A2, true),
  ],
  "w-m16a2-m203-assault": [
    bind("w-m16a2-m203-assault", ATT_M16_4X20, false),
    bind("w-m16a2-m203-assault", ATT_M16_AP2K, false),
    bind("w-m16a2-m203-assault", ATT_M16_FH, true),
    bind("w-m16a2-m203-assault", ATT_M16_SUPP, false),
    bind("w-m16a2-m203-assault", ATT_MAG_M16A2, true),
  ],
  "w-vz58-assault": [
    bind("w-vz58-assault", ATT_VZ58_STOCK_FIXED, true),
    bind("w-vz58-assault", ATT_VZ58_STOCK_FOLDING, false),
    bind("w-vz58-assault", ATT_MAG_VZ58, true),
  ],
  // ── ASSAULT SECONDARY ──
  "w-m9-assault": [bind("w-m9-assault", ATT_MAG_M9, true)],
  "w-pm-assault": [bind("w-pm-assault", ATT_MAG_PM, true)],

  // ── ENGINEER PRIMARY ──
  "w-aks74u-engineer": [
    bind("w-aks74u-engineer", ATT_AKS74U_FH, true),
    bind("w-aks74u-engineer", ATT_PBS4, false),
    bind("w-aks74u-engineer", ATT_MAG_AK74, true),
  ],
  "w-aks74un-engineer": [
    bind("w-aks74un-engineer", ATT_1P29, false),
    bind("w-aks74un-engineer", ATT_AKS74U_FH, true),
    bind("w-aks74un-engineer", ATT_PBS4, false),
    bind("w-aks74un-engineer", ATT_MAG_AK74, true),
  ],
  "w-m16a2-carabine-engineer": [
    bind("w-m16a2-carabine-engineer", ATT_M16_4X20, false),
    bind("w-m16a2-carabine-engineer", ATT_M16_AP2K, false),
    bind("w-m16a2-carabine-engineer", ATT_M16CARB_HG_BASE, true),
    bind("w-m16a2-carabine-engineer", ATT_M16CARB_HG_SOLID, false),
    bind("w-m16a2-carabine-engineer", ATT_M16CARB_HG_STRIPES, false),
    bind("w-m16a2-carabine-engineer", ATT_M16_FH, true),
    bind("w-m16a2-carabine-engineer", ATT_M16_SUPP, false),
    bind("w-m16a2-carabine-engineer", ATT_MAG_M16A2, true),
  ],
  // ── ENGINEER SECONDARY ──
  "w-m9-engineer": [bind("w-m9-engineer", ATT_MAG_M9, true)],
  "w-pm-engineer": [bind("w-pm-engineer", ATT_MAG_PM, true)],
  // ── ENGINEER SPECIAL ──
  "w-rpg7-engineer": [bind("w-rpg7-engineer", ATT_PGO7V3, false)],

  // ── SUPPORT PRIMARY ──
  "w-m249-support": [bind("w-m249-support", ATT_MAG_M249, true)],
  "w-m60-support": [bind("w-m60-support", ATT_MAG_M60, true)],
  "w-pkm-support": [bind("w-pkm-support", ATT_MAG_PKM, true)],
  "w-pkmn-support": [
    bind("w-pkmn-support", ATT_1P29, false),
    bind("w-pkmn-support", ATT_MAG_PKM, true),
  ],
  "w-rpk74-support": [bind("w-rpk74-support", ATT_MAG_RPK74, true)],
  "w-rpk74n-support": [
    bind("w-rpk74n-support", ATT_1P29, false),
    bind("w-rpk74n-support", ATT_MAG_RPK74, true),
  ],
  "w-uk59-support": [
    bind("w-uk59-support", ATT_UK59_OPTIC, false),
    bind("w-uk59-support", ATT_MAG_UK59, true),
  ],
  // ── SUPPORT SECONDARY ──
  "w-m9-support": [bind("w-m9-support", ATT_MAG_M9, true)],
  "w-pm-support": [bind("w-pm-support", ATT_MAG_PM, true)],

  // ── RECON PRIMARY ──
  "w-m21-recon": [
    bind("w-m21-recon", ATT_M21_ARTII, true),
    bind("w-m21-recon", ATT_MAG_M21, true),
  ],
  "w-m21camo-recon": [
    bind("w-m21camo-recon", ATT_M21_ARTII_CAMO, true),
    bind("w-m21camo-recon", ATT_MAG_M21, true),
  ],
  "w-svd-recon": [
    bind("w-svd-recon", ATT_PSO1, true),
    bind("w-svd-recon", ATT_MAG_SVD, true),
  ],
  // ── RECON SECONDARY ──
  "w-m9-recon": [bind("w-m9-recon", ATT_MAG_M9, true)],
  "w-pm-recon": [bind("w-pm-recon", ATT_MAG_PM, true)],
};

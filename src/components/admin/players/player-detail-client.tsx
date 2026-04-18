"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { fmt } from "@/lib/utils";

// ─── Types ──────────────────────────────────────

interface ResolvedWeapon {
  id: string;
  name: string;
  type: string;
}

interface ResolvedAttachment {
  id: string;
  name: string;
  slot: string;
}

interface Loadout {
  id: string;
  class: string;
  weapon: ResolvedWeapon | null;
  pistol: ResolvedWeapon | null;
  gadget: { id: string; name: string } | null;
  grenade: { id: string; name: string } | null;
}

interface WeaponSetup {
  id: string;
  weapon: ResolvedWeapon;
  attachments: { id: string; attachment: ResolvedAttachment }[];
}

interface Unlock {
  id: string;
  itemType: string;
  itemId: string;
  itemName: string;
  createdAt: string;
}

interface PlayerDetail {
  id: string;
  uid: string;
  nickname: string;
  xpBalance: number;
  xpLifetime: number;
  kills: number;
  deaths: number;
  assists: number;
  wins: number;
  losses: number;
  flagsCaptured: number;
  createdAt: string;
  updatedAt: string;
  loadouts: Loadout[];
  weaponSetups: WeaponSetup[];
  unlocks: Unlock[];
}

// ─── Component ──────────────────────────────────

export function PlayerDetailClient({ playerId }: { playerId: string }) {
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/players/${playerId}`);
        if (!res.ok) {
          setError("Player not found");
          return;
        }
        setPlayer(await res.json());
      } catch {
        setError("Failed to load player");
      } finally {
        setLoading(false);
      }
    })();
  }, [playerId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <BackButton />
        <div className="py-12 text-center text-zinc-500">Loading player...</div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="space-y-6">
        <BackButton />
        <div className="py-12 text-center text-zinc-500">{error ?? "Player not found"}</div>
      </div>
    );
  }

  const kdRatio = player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills > 0 ? player.kills.toFixed(2) : "0.00";

  const statCards = [
    { label: "XP Balance", value: fmt(player.xpBalance) },
    { label: "XP Lifetime", value: fmt(player.xpLifetime) },
    { label: "Kills", value: fmt(player.kills) },
    { label: "Deaths", value: fmt(player.deaths) },
    { label: "Assists", value: fmt(player.assists) },
    { label: "Wins", value: fmt(player.wins) },
    { label: "Losses", value: fmt(player.losses) },
    { label: "Flags Captured", value: fmt(player.flagsCaptured) },
    { label: "K/D Ratio", value: kdRatio },
  ];

  const classOrder = ["ASSAULT", "ENGINEER", "SUPPORT", "RECON"];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <BackButton />

      {/* Player header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          {player.nickname}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
          <span className="font-mono text-xs">{player.uid}</span>
          <span>
            Member since{" "}
            {new Date(player.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-zinc-800 bg-zinc-900">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-zinc-400">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-zinc-100">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loadouts */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-100">Loadouts</h2>
        {player.loadouts.length === 0 ? (
          <p className="text-sm text-zinc-500">No loadouts configured</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {classOrder.map((cls) => {
              const loadout = player.loadouts.find((l) => l.class === cls);
              return (
                <Card key={cls} className="border-zinc-800 bg-zinc-900">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold text-zinc-100">
                      {cls.charAt(0) + cls.slice(1).toLowerCase()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {loadout ? (
                      <>
                        <LoadoutSlot label="Primary" value={loadout.weapon?.name} />
                        <LoadoutSlot label="Secondary" value={loadout.pistol?.name} />
                        <LoadoutSlot label="Gadget" value={loadout.gadget?.name} />
                        <LoadoutSlot label="Grenade" value={loadout.grenade?.name} />
                      </>
                    ) : (
                      <p className="text-zinc-500">Not configured</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Weapon Setups */}
      {player.weaponSetups.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-100">
            Weapon Setups
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {player.weaponSetups.map((setup) => (
              <Card key={setup.id} className="border-zinc-800 bg-zinc-900">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-zinc-100">
                    {setup.weapon.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {setup.attachments.length === 0 ? (
                    <p className="text-sm text-zinc-500">No attachments</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {setup.attachments.map((a) => (
                        <Badge
                          key={a.id}
                          variant="secondary"
                          className="bg-zinc-800 text-zinc-300"
                        >
                          {a.attachment.name}
                          <span className="ml-1 text-zinc-500">
                            ({a.attachment.slot.charAt(0) +
                              a.attachment.slot.slice(1).toLowerCase()})
                          </span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Unlocks */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-100">Unlocks</h2>
        {player.unlocks.length === 0 ? (
          <p className="text-sm text-zinc-500">No unlocks yet</p>
        ) : (
          <UnlocksSection unlocks={player.unlocks} />
        )}
      </section>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────

function BackButton() {
  return (
    <Link href="/players">
      <Button
        variant="ghost"
        size="sm"
        className="text-zinc-400 hover:text-zinc-100"
      >
        <ArrowLeft className="mr-1 size-4" />
        Back to Players
      </Button>
    </Link>
  );
}

function LoadoutSlot({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-400">{label}</span>
      <span className={value ? "text-zinc-200" : "text-zinc-600"}>
        {value ?? "None"}
      </span>
    </div>
  );
}

const UNLOCK_GROUPS: { type: string; label: string }[] = [
  { type: "WEAPON", label: "Weapons" },
  { type: "ATTACHMENT", label: "Attachments" },
  { type: "GADGET", label: "Gadgets" },
  { type: "GRENADE", label: "Grenades" },
];

function UnlocksSection({ unlocks }: { unlocks: Unlock[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const grouped = UNLOCK_GROUPS.map((g) => ({
    ...g,
    items: unlocks.filter((u) => u.itemType === g.type),
  })).filter((g) => g.items.length > 0);

  const toggle = (type: string) => {
    setExpanded((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <div className="space-y-2">
      {grouped.map((group) => (
        <Card key={group.type} className="border-zinc-800 bg-zinc-900">
          <button
            type="button"
            onClick={() => toggle(group.type)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-sm font-medium text-zinc-100">
              {group.label}{" "}
              <span className="text-zinc-500">({group.items.length})</span>
            </span>
            {expanded[group.type] ? (
              <ChevronDown className="size-4 text-zinc-400" />
            ) : (
              <ChevronRight className="size-4 text-zinc-400" />
            )}
          </button>
          {expanded[group.type] && (
            <CardContent className="border-t border-zinc-800 pt-3">
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <Badge
                    key={item.id}
                    variant="secondary"
                    className="bg-zinc-800 text-zinc-300"
                  >
                    {item.itemName}
                  </Badge>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

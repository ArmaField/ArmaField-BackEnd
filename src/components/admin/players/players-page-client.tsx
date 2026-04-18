"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  SearchIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import { FaMoneyBillWave } from "react-icons/fa";
import { timeAgo, fmt } from "@/lib/utils";

interface PlayerRow {
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
  updatedAt: string;
}

interface PlayersResponse {
  players: PlayerRow[];
  total: number;
  page: number;
  totalPages: number;
}

type SortField = "nickname" | "xpLifetime" | "kills" | "deaths" | "updatedAt";

/* ------------------------------------------------------------------ */
/*  Edit Player Dialog                                                 */
/* ------------------------------------------------------------------ */

interface EditPlayerDialogProps {
  player: PlayerRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function EditPlayerDialog({
  player,
  open,
  onOpenChange,
  onSuccess,
}: EditPlayerDialogProps) {
  const t = useTranslations("players");
  const tc = useTranslations("common");

  const [nickname, setNickname] = useState(player.nickname);
  const [xpBalance, setXpBalance] = useState(String(player.xpBalance));
  const [xpLifetime, setXpLifetime] = useState(String(player.xpLifetime));
  const [kills, setKills] = useState(String(player.kills));
  const [deaths, setDeaths] = useState(String(player.deaths));
  const [assists, setAssists] = useState("0");
  const [wins, setWins] = useState(String(player.wins));
  const [losses, setLosses] = useState(String(player.losses));
  const [flagsCaptured, setFlagsCaptured] = useState("0");
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  // Fetch full player data (includes assists, flagsCaptured)
  useEffect(() => {
    if (!open) return;
    setFetched(false);
    (async () => {
      try {
        const res = await fetch(`/api/admin/players/${player.id}`);
        if (res.ok) {
          const data = await res.json();
          setNickname(data.nickname);
          setXpBalance(String(data.xpBalance));
          setXpLifetime(String(data.xpLifetime));
          setKills(String(data.kills));
          setDeaths(String(data.deaths));
          setAssists(String(data.assists));
          setWins(String(data.wins));
          setLosses(String(data.losses));
          setFlagsCaptured(String(data.flagsCaptured));
        }
      } catch {
        // Use row data as fallback
      } finally {
        setFetched(true);
      }
    })();
  }, [open, player.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/players/${player.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          xpBalance: Number(xpBalance),
          xpLifetime: Number(xpLifetime),
          kills: Number(kills),
          deaths: Number(deaths),
          assists: Number(assists),
          wins: Number(wins),
          losses: Number(losses),
          flagsCaptured: Number(flagsCaptured),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || t("playerUpdateFailed"));
        return;
      }

      toast.success(t("playerUpdated"));
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error(t("playerUpdateFailed"));
    } finally {
      setLoading(false);
    }
  };

  const numField = (
    label: string,
    value: string,
    setValue: (v: string) => void,
  ) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-zinc-400">{label}</Label>
      <Input
        value={value}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9]/g, "");
          setValue(v);
        }}
        inputMode="numeric"
        disabled={loading}
        className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("editPlayer")}</DialogTitle>
          <DialogDescription>
            {t("editPlayerDescription", { name: player.nickname })}
          </DialogDescription>
        </DialogHeader>
        {!fetched ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-zinc-800" />
            ))}
          </div>
        ) : (
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-player-nickname">{t("nickname")}</Label>
              <Input
                id="edit-player-nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {numField(t("xpBalance"), xpBalance, setXpBalance)}
              {numField(t("xpLifetime"), xpLifetime, setXpLifetime)}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {numField(t("kills"), kills, setKills)}
              {numField(t("deaths"), deaths, setDeaths)}
              {numField(t("assists"), assists, setAssists)}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {numField(t("wins"), wins, setWins)}
              {numField(t("losses"), losses, setLosses)}
              {numField(t("flagsCaptured"), flagsCaptured, setFlagsCaptured)}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={loading || !nickname.trim()}>
              {loading ? t("saving") : tc("save")}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete Player Dialog                                               */
/* ------------------------------------------------------------------ */

interface DeletePlayerDialogProps {
  player: PlayerRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function DeletePlayerDialog({
  player,
  open,
  onOpenChange,
  onSuccess,
}: DeletePlayerDialogProps) {
  const t = useTranslations("players");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/players/${player.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        toast.error(t("playerDeleteFailed"));
        return;
      }

      toast.success(t("playerDeleted"));
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error(t("playerDeleteFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deletePlayer")}</DialogTitle>
          <DialogDescription>
            {t("deletePlayerConfirm", { name: player.nickname })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {tc("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? t("deleting") : tc("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Players Page                                                       */
/* ------------------------------------------------------------------ */

export function PlayersPageClient({ canManage = false }: { canManage?: boolean }) {
  const t = useTranslations("players");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [data, setData] = useState<PlayersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortField>("updatedAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [editPlayer, setEditPlayer] = useState<PlayerRow | null>(null);
  const [deletePlayer, setDeletePlayer] = useState<PlayerRow | null>(null);

  // Debounce search input
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        sort,
        order,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/admin/players?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [page, sort, order, debouncedSearch]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const handleSort = (field: SortField) => {
    if (sort === field) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSort(field);
      setOrder("desc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort !== field)
      return <ArrowUpDown className="ml-1 inline size-3 opacity-40" />;
    return order === "asc" ? (
      <ArrowUp className="ml-1 inline size-3" />
    ) : (
      <ArrowDown className="ml-1 inline size-3" />
    );
  };

  const copyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    toast.success(t("uidCopied"));
  };

  const players = data?.players ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const colSpan = 9; // Nickname, UID, XP Balance, XP Lifetime, K/D/A, K/D Ratio, W/L, Last Seen, Actions

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <span className="text-sm text-zinc-400">
          {total > 0 && `${fmt(total)} ${tc("total")}`}
        </span>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                {/* Nickname */}
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort("nickname")}
                    className="inline-flex items-center text-zinc-400 hover:text-zinc-100"
                  >
                    {t("nickname")}
                    <SortIcon field="nickname" />
                  </button>
                </TableHead>

                {/* UID — hidden on mobile */}
                <TableHead className="hidden sm:table-cell text-zinc-400">
                  {t("uid")}
                </TableHead>

                {/* XP Balance — hidden on mobile */}
                <TableHead className="hidden sm:table-cell">
                  <button
                    type="button"
                    onClick={() => handleSort("xpLifetime")}
                    className="inline-flex items-center text-zinc-400 hover:text-zinc-100"
                  >
                    {t("xpBalance")}
                    <SortIcon field="xpLifetime" />
                  </button>
                </TableHead>

                {/* XP Lifetime — hidden on mobile */}
                <TableHead className="hidden sm:table-cell text-zinc-400">
                  {t("xpLifetime")}
                </TableHead>

                {/* K/D/A */}
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort("kills")}
                    className="inline-flex items-center text-zinc-400 hover:text-zinc-100"
                  >
                    K/D/A
                    <SortIcon field="kills" />
                  </button>
                </TableHead>

                {/* K/D Ratio — hidden on mobile */}
                <TableHead className="hidden md:table-cell text-zinc-400">K/D</TableHead>

                {/* W/L */}
                <TableHead className="text-zinc-400">{t("wl")}</TableHead>

                {/* Last Seen — hidden on mobile */}
                <TableHead className="hidden sm:table-cell">
                  <button
                    type="button"
                    onClick={() => handleSort("updatedAt")}
                    className="inline-flex items-center text-zinc-400 hover:text-zinc-100"
                  >
                    {t("lastSeen")}
                    <SortIcon field="updatedAt" />
                  </button>
                </TableHead>

                {/* Actions */}
                {canManage && (
                <TableHead className="text-right text-zinc-400">
                  <span className="hidden sm:inline">{t("actions")}</span>
                </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && players.length === 0 ? (
                <TableRow className="border-zinc-800">
                  <TableCell colSpan={colSpan} className="py-8 text-center text-zinc-500">
                    {tc("loading")}
                  </TableCell>
                </TableRow>
              ) : players.length === 0 ? (
                <TableRow className="border-zinc-800">
                  <TableCell colSpan={colSpan} className="py-8 text-center text-zinc-500">
                    {debouncedSearch ? t("noPlayersFound") : t("noPlayersYet")}
                  </TableCell>
                </TableRow>
              ) : (
                players.map((player) => (
                  <TableRow
                    key={player.id}
                    className="border-zinc-800 hover:bg-zinc-800/50"
                  >
                    {/* Nickname */}
                    <TableCell className="font-medium">
                      <Link
                        href={`/players/${player.id}`}
                        className="text-zinc-100 hover:text-white hover:underline"
                      >
                        {player.nickname}
                      </Link>
                    </TableCell>

                    {/* UID — hidden on mobile, truncated, click to copy */}
                    <TableCell className="hidden sm:table-cell">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <button
                                onClick={() => copyUid(player.uid)}
                                className="cursor-pointer font-mono text-xs text-zinc-400 transition-colors hover:text-zinc-200"
                              />
                            }
                          >
                            {player.uid.length > 12
                              ? player.uid.slice(0, 12) + "..."
                              : player.uid}
                          </TooltipTrigger>
                          <TooltipContent>{t("clickToCopyUid")}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    {/* XP Balance — hidden on mobile */}
                    <TableCell className="hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-amber-400">
                        <FaMoneyBillWave className="size-3.5" />
                        {fmt(player.xpBalance)}
                      </span>
                    </TableCell>

                    {/* XP Lifetime — hidden on mobile */}
                    <TableCell className="hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-purple-400">
                        <FaMoneyBillWave className="size-3.5" />
                        {fmt(player.xpLifetime)}
                      </span>
                    </TableCell>

                    {/* K/D/A */}
                    <TableCell className="text-xs sm:text-sm">
                      <span className="text-emerald-400">{fmt(player.kills)}</span>
                      <span className="text-zinc-600">/</span>
                      <span className="text-red-400">{fmt(player.deaths)}</span>
                      <span className="text-zinc-600">/</span>
                      <span className="text-blue-400">{fmt(player.assists)}</span>
                    </TableCell>

                    {/* K/D Ratio — hidden on mobile */}
                    <TableCell className="hidden md:table-cell">
                      <span className={player.deaths > 0 ? (player.kills / player.deaths >= 1 ? "text-emerald-400" : "text-red-400") : "text-emerald-400"}>
                        {player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills.toFixed(2)}
                      </span>
                    </TableCell>

                    {/* W/L — wins green, losses red */}
                    <TableCell className="text-xs sm:text-sm">
                      <span className="text-emerald-400">{fmt(player.wins)}</span>
                      <span className="text-zinc-600">/</span>
                      <span className="text-red-400">{fmt(player.losses)}</span>
                    </TableCell>

                    {/* Last Seen — hidden on mobile */}
                    <TableCell className="hidden sm:table-cell text-zinc-400">
                      {timeAgo(new Date(player.updatedAt), locale)}
                    </TableCell>

                    {/* Actions */}
                    {canManage && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  onClick={() => setEditPlayer(player)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                                />
                              }
                            >
                              <PencilIcon className="size-3.5" />
                            </TooltipTrigger>
                            <TooltipContent>{tc("edit")}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <button
                                  onClick={() => setDeletePlayer(player)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-400 transition-colors hover:bg-zinc-800 hover:text-red-300"
                                />
                              }
                            >
                              <TrashIcon className="size-3.5" />
                            </TooltipTrigger>
                            <TooltipContent>{tc("delete")}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400">
            {tc("page", { current: page, total: totalPages })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-40"
            >
              <ChevronLeft className="mr-1 size-4" />
              {tc("previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-40"
            >
              {tc("next")}
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Player Dialog */}
      {editPlayer && (
        <EditPlayerDialog
          player={editPlayer}
          open={!!editPlayer}
          onOpenChange={(open) => {
            if (!open) setEditPlayer(null);
          }}
          onSuccess={fetchPlayers}
        />
      )}

      {/* Delete Player Dialog */}
      {deletePlayer && (
        <DeletePlayerDialog
          player={deletePlayer}
          open={!!deletePlayer}
          onOpenChange={(open) => {
            if (!open) setDeletePlayer(null);
          }}
          onSuccess={fetchPlayers}
        />
      )}
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { CopyIcon, PencilIcon, RefreshCwIcon, TrashIcon, PlusIcon } from "lucide-react";
import { AddServerDialog } from "./add-server-dialog";
import { EditServerDialog } from "./edit-server-dialog";
import { DeleteServerDialog } from "./delete-server-dialog";
import { RegenerateTokenDialog } from "./regenerate-token-dialog";

interface Server {
  id: string;
  name: string;
  ip: string | null;
  token: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface ServersPageClientProps {
  initialServers: Server[];
  testMode?: boolean;
}

export function ServersPageClient({ initialServers, testMode = false }: ServersPageClientProps) {
  const t = useTranslations("servers");
  const tc = useTranslations("common");
  const [servers, setServers] = useState<Server[]>(initialServers);
  const [addOpen, setAddOpen] = useState(false);
  const [editServer, setEditServer] = useState<Server | null>(null);
  const [deleteServer, setDeleteServer] = useState<Server | null>(null);
  const [regenerateServer, setRegenerateServer] = useState<Server | null>(null);

  const refreshServers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/servers");
      if (res.ok) {
        const data = await res.json();
        setServers(data);
      }
    } catch {
      // Silent refresh failure
    }
  }, []);

  const copyToken = useCallback(async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      toast.success(t("tokenCopied"));
    } catch {
      toast.error(t("tokenCopyFailed"));
    }
  }, []);

  const testModeClick = () => {
    toast.warning(t("disabledInTestMode"));
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        {testMode ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={<Button className="opacity-50" onClick={testModeClick} />}
              >
                <PlusIcon data-icon="inline-start" />
                {t("addServer")}
              </TooltipTrigger>
              <TooltipContent className="border-amber-800/40 bg-amber-950 text-amber-400">
                {t("disabledInTestMode")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button onClick={() => setAddOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            {t("addServer")}
          </Button>
        )}
      </div>

      {/* Table */}
      {servers.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 p-12 text-center text-zinc-500">
          {t("noServers")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead>{t("name")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("ip")}</TableHead>
                <TableHead>{t("token")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-right">{tc("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.map((server) => (
                <TableRow key={server.id} className="border-zinc-800">
                  <TableCell>
                    <div className="max-w-[100px] truncate font-medium sm:max-w-[200px] lg:max-w-[300px]">{server.name}</div>
                  </TableCell>
                  <TableCell className="hidden text-zinc-400 sm:table-cell">
                    {server.ip || "\u2014"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="hidden text-xs text-zinc-500 sm:inline">{"••••••••"}</code>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => copyToken(server.token)}
                              />
                            }
                          >
                            <CopyIcon className="size-3" />
                          </TooltipTrigger>
                          <TooltipContent>{t("copyToken")}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  <TableCell>
                    {server.isActive ? (
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25">
                        {tc("active")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-zinc-400">
                        {tc("inactive")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className={`flex items-center justify-end gap-1 ${testMode ? "opacity-40" : ""}`}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={testMode ? testModeClick : () => setEditServer(server)}
                              />
                            }
                          >
                            <PencilIcon className="size-3" />
                          </TooltipTrigger>
                          <TooltipContent className={testMode ? "border-amber-800/40 bg-amber-950 text-amber-400" : ""}>{testMode ? t("disabledInTestMode") : t("editServer")}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={testMode ? testModeClick : () => setRegenerateServer(server)}
                              />
                            }
                          >
                            <RefreshCwIcon className="size-3" />
                          </TooltipTrigger>
                          <TooltipContent className={testMode ? "border-amber-800/40 bg-amber-950 text-amber-400" : ""}>{testMode ? t("disabledInTestMode") : t("regenerateToken")}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className={testMode ? "" : "text-red-400 hover:text-red-300"}
                                onClick={testMode ? testModeClick : () => setDeleteServer(server)}
                              />
                            }
                          >
                            <TrashIcon className="size-3" />
                          </TooltipTrigger>
                          <TooltipContent className={testMode ? "border-amber-800/40 bg-amber-950 text-amber-400" : ""}>{testMode ? t("disabledInTestMode") : t("deleteServer")}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </div>
      )}

      {/* Dialogs (only in non-test mode) */}
      {!testMode && (
        <>
          <AddServerDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={refreshServers} />
          {editServer && (
            <EditServerDialog
              server={editServer}
              open={!!editServer}
              onOpenChange={(open) => { if (!open) setEditServer(null); }}
              onSuccess={refreshServers}
            />
          )}
          {deleteServer && (
            <DeleteServerDialog
              server={deleteServer}
              open={!!deleteServer}
              onOpenChange={(open) => { if (!open) setDeleteServer(null); }}
              onSuccess={refreshServers}
            />
          )}
          {regenerateServer && (
            <RegenerateTokenDialog
              server={regenerateServer}
              open={!!regenerateServer}
              onOpenChange={(open) => { if (!open) setRegenerateServer(null); }}
              onSuccess={refreshServers}
            />
          )}
        </>
      )}
    </div>
  );
}

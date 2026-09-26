// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState } from "react";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listMyBlocks, unblockUser } from "@/lib/community";

/** Profile list of accounts the member has blocked, with unblock. */
export function BlockedAccounts() {
  const [rows, setRows] = useState<Array<{ id: string; name: string }> | null>(null);

  const load = () => void listMyBlocks().then(setRows).catch(() => setRows([]));
  useEffect(load, []);

  if (!rows || rows.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
      <p className="flex items-center gap-3 text-sm text-foreground">
        <Ban className="size-4 text-signal" /> Blocked accounts
      </p>
      <ul className="mt-2 space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between text-sm text-muted-foreground">
            {r.name}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void unblockUser(r.id)
                  .then(() => {
                    toast.success(`${r.name} unblocked.`);
                    load();
                  })
                  .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Couldn't unblock."))
              }
            >
              Unblock
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

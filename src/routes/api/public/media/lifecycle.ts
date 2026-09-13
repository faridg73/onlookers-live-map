import { createFileRoute } from "@tanstack/react-router";

/**
 * Hourly media lifecycle worker.
 *
 * Called by a scheduled database job with a shared secret. It marks clips older
 * than 24 hours as expired (hiding them from the map, feeds and Explore) and
 * permanently deletes the raw video files from storage so dead data stops
 * costing money.
 */
export const Route = createFileRoute("/api/public/media/lifecycle")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["MEDIA_LIFECYCLE_SECRET"];
        const provided = request.headers.get("x-lifecycle-secret") ?? "";
        if (!secret || provided !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Mark expired clips + requests and enqueue their files.
        const { data: swept, error: sweepError } = await supabaseAdmin.rpc("expire_stale_media");
        if (sweepError) {
          console.error("media lifecycle sweep failed", sweepError);
          return Response.json({ error: sweepError.message }, { status: 500 });
        }

        // 2. Purge the queued storage objects, bucket by bucket.
        const { data: queued, error: queueError } = await supabaseAdmin
          .from("media_purge_queue")
          .select("id, bucket, path")
          .is("purged_at", null)
          .limit(500);
        if (queueError) {
          console.error("media purge queue read failed", queueError);
          return Response.json({ error: queueError.message }, { status: 500 });
        }

        const rows = queued ?? [];
        const byBucket = new Map<string, { id: string; path: string }[]>();
        for (const row of rows) {
          const list = byBucket.get(row.bucket) ?? [];
          list.push({ id: row.id, path: row.path });
          byBucket.set(row.bucket, list);
        }

        let purged = 0;
        for (const [bucket, items] of byBucket) {
          const { error } = await supabaseAdmin.storage
            .from(bucket)
            .remove(items.map((item) => item.path));
          const ids = items.map((item) => item.id);
          if (error) {
            console.error(`storage purge failed for ${bucket}`, error);
            await supabaseAdmin
              .from("media_purge_queue")
              .update({ error_message: error.message })
              .in("id", ids);
            continue;
          }
          await supabaseAdmin
            .from("media_purge_queue")
            .update({ purged_at: new Date().toISOString(), error_message: "" })
            .in("id", ids);
          purged += items.length;
        }

        // 3. Record that the expired clip rows no longer point at live files.
        if (purged > 0) {
          await supabaseAdmin
            .from("bounty_videos")
            .update({ purged_at: new Date().toISOString() })
            .not("expired_at", "is", null)
            .is("purged_at", null);
        }

        return Response.json({ error: sweepError.message }, { status: 500 });
        }

        // 2. Purge the queued storage objects, bucket by bucket.
        const { data: queued, error: queueError } = await supabaseAdmin
          .from("media_purge_queue")
          .select("id, bucket, path")
          .is("purged_at", null)
          .limit(500);
        if (queueError) {
          console.error("media purge queue read failed", queueError);
          return Response.json({ error: queueError.message }, { status: 500 });
        }

        const rows = queued ?? [];
        const byBucket = new Map<string, { id: string; path: string }[]>();
        for (const row of rows) {
          const list = byBucket.get(row.bucket) ?? [];
          list.push({ id: row.id, path: row.path });
          byBucket.set(row.bucket, list);
        }

        let purged = 0;
        for (const [bucket, items] of byBucket) {
          const { error } = await supabaseAdmin.storage
            .from(bucket)
            .remove(items.map((item) => item.path));
          const ids = items.map((item) => item.id);
          if (error) {
            console.error(`storage purge failed for ${bucket}`, error);
            await supabaseAdmin
              .from("media_purge_queue")
              .update({ error_message: error.message })
              .in("id", ids);
            continue;
          }
          await supabaseAdmin
            .from("media_purge_queue")
            .update({ purged_at: new Date().toISOString(), error_message: "" })
            .in("id", ids);
          purged += items.length;
        }

        // 3. Record that the clip rows no longer point at live files.
        const purgedVideoIds = [
          ...new Set(
            rows
              .filter((row) => byBucket.get(row.bucket))
              .map((row) => row.path.split("/")[0])
              .filter(Boolean),
          ),
        ];
        if (purged > 0) {
          await supabaseAdmin
            .from("bounty_videos")
            .update({ purged_at: new Date().toISOString() })
            .not("expired_at", "is", null)
            .is("purged_at", null);
        }

        return Response.json({ swept, purged, queued: rows.length });
      },
    },
  },
});

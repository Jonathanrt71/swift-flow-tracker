/**
 * useDeidentifyNames.ts
 * 
 * Fetches all name sources (profiles + known_names) and combines them
 * into a single array for the de-identification engine.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProfileEntry } from "@/lib/deidentify";

export function useDeidentifyNames() {
  return useQuery({
    queryKey: ["deidentify_names"],
    queryFn: async () => {
      // Fetch all profiles (residents + faculty + admin)
      const { data: profiles, error: profilesErr } = await (
        supabase.from("profiles" as any)
          .select("id, first_name, last_name, display_name, ni_names") as any
      );
      if (profilesErr) throw profilesErr;

      // Fetch all known_names (staff, external providers, etc.)
      const { data: knownNames, error: knownErr } = await (
        supabase.from("known_names" as any)
          .select("id, first_name, last_name, display_name") as any
      );
      if (knownErr) throw knownErr;

      // Combine into a single ProfileEntry array
      const allNames: ProfileEntry[] = [
        ...((profiles || []) as any[]).map((p: any) => ({
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          display_name: p.display_name,
          ni_names: p.ni_names,
        })),
        ...((knownNames || []) as any[]).map((k: any) => ({
          id: k.id,
          first_name: k.first_name,
          last_name: k.last_name,
          display_name: k.display_name,
          ni_names: null,
        })),
      ];

      return allNames;
    },
  });
}

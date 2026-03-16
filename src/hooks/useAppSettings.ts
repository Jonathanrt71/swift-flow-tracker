import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AppSettings {
  faculty_task_limit: number;
  resident_task_limit: number;
}

const DEFAULTS: AppSettings = {
  faculty_task_limit: 10,
  resident_task_limit: 5,
};

export function useAppSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("app_settings")
        .select("key, value");
      if (error) throw error;

      const settings = { ...DEFAULTS };
      (data || []).forEach((row: any) => {
        if (row.key === "faculty_task_limit") settings.faculty_task_limit = parseInt(row.value, 10);
        if (row.key === "resident_task_limit") settings.resident_task_limit = parseInt(row.value, 10);
      });
      return settings;
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await (supabase as any)
        .from("app_settings")
        .upsert({ key, value }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      toast({ title: "Setting updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return {
    settings: query.data || DEFAULTS,
    isLoading: query.isLoading,
    updateSetting,
  };
}

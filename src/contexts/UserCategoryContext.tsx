import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";

type UserCategory = "FM" | "GME";

interface UserCategoryContextType {
  /** The active category used for filtering data */
  activeCategory: UserCategory;
  /** The current user's own category from their profile */
  ownCategory: UserCategory;
  /** Admin-only: switch the active category */
  setActiveCategory: (cat: UserCategory) => void;
  /** Whether the context has loaded */
  isLoaded: boolean;
}

const UserCategoryContext = createContext<UserCategoryContextType>({
  activeCategory: "FM",
  ownCategory: "FM",
  setActiveCategory: () => {},
  isLoaded: false,
});

export const useUserCategory = () => useContext(UserCategoryContext);

export const UserCategoryProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [ownCategory, setOwnCategory] = useState<UserCategory>("FM");
  const [adminOverride, setAdminOverride] = useState<UserCategory | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch the user's own category from profiles
  useEffect(() => {
    if (!user?.id) return;
    (supabase as any)
      .from("profiles")
      .select("user_category")
      .eq("id", user.id)
      .single()
      .then(({ data }: { data: any }) => {
        const cat = data?.user_category || "FM";
        setOwnCategory(cat as UserCategory);
        setIsLoaded(true);
      });
  }, [user?.id]);

  // Restore admin override from localStorage
  useEffect(() => {
    if (isAdmin) {
      const stored = localStorage.getItem("admin_category_override");
      if (stored === "FM" || stored === "GME") {
        setAdminOverride(stored);
      }
    }
  }, [isAdmin]);

  const setActiveCategory = (cat: UserCategory) => {
    setAdminOverride(cat);
    localStorage.setItem("admin_category_override", cat);
  };

  const activeCategory = isAdmin && adminOverride ? adminOverride : ownCategory;

  return (
    <UserCategoryContext.Provider value={{ activeCategory, ownCategory, setActiveCategory, isLoaded }}>
      {children}
    </UserCategoryContext.Provider>
  );
};

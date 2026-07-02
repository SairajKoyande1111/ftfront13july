import { useQuery } from "@tanstack/react-query";
import { getHubHeaders } from "@/lib/queryClient";
import type { Coupon } from "@shared/schema";

export function useCoupons() {
  return useQuery<Coupon[]>({
    queryKey: ["/api/coupons"],
    queryFn: async () => {
      const res = await fetch("/api/coupons", {
        headers: getHubHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch coupons");
      return res.json();
    },
  });
}

export function useProductCoupons(productId: string | null | undefined, couponIds: string[]) {
  const { data: allCoupons, isLoading } = useCoupons();
  // Only show coupons that are assigned to this product AND have visibleOnWebsite: true
  const coupons = allCoupons?.filter((c) => couponIds.includes(c.id) && c.visibleOnWebsite !== false) ?? [];
  return { coupons, isLoading };
}

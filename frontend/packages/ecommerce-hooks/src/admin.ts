"use client";

import type {
  AdminOrderQuery,
  CategoryInput,
  Guid,
  PageQuery,
  RefundInput,
  SettlementInput,
  VariantInput,
  VariantUpdateInput,
} from "@ecommerce/api-contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEcommerceClients } from "./provider";

export function useAdminCategories() {
  const { api } = useEcommerceClients();
  return useQuery({ queryKey: ["admin", "categories"], queryFn: api.admin.categories });
}

export function useUpdateCategory() {
  const { api } = useEcommerceClients();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: Guid; input: CategoryInput }) => api.admin.updateCategory(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "categories"] }),
  });
}

function useProductRefresh() {
  const queryClient = useQueryClient();
  return (id: Guid) => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "product", id] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
  };
}

export function useCreateVariant() {
  const { api } = useEcommerceClients();
  const refresh = useProductRefresh();
  return useMutation({
    mutationFn: ({ id, input }: { id: Guid; input: VariantInput }) => api.admin.createVariant(id, input),
    onSuccess: (_, { id }) => refresh(id),
  });
}

export function useUpdateVariant() {
  const { api } = useEcommerceClients();
  const refresh = useProductRefresh();
  return useMutation({
    mutationFn: ({ id, variantId, input }: { id: Guid; variantId: Guid; input: VariantUpdateInput }) =>
      api.admin.updateVariant(id, variantId, input),
    onSuccess: (_, { id }) => refresh(id),
  });
}

export function useDeleteVariant() {
  const { api } = useEcommerceClients();
  const refresh = useProductRefresh();
  return useMutation({
    mutationFn: ({ id, variantId }: { id: Guid; variantId: Guid }) => api.admin.deleteVariant(id, variantId),
    onSuccess: (_, { id }) => refresh(id),
  });
}

function useImageMutation<V extends { id: Guid }>(run: (api: ReturnType<typeof useEcommerceClients>["api"], v: V) => Promise<unknown>) {
  const { api } = useEcommerceClients();
  const refresh = useProductRefresh();
  return useMutation({ mutationFn: (v: V) => run(api, v), onSuccess: (_, v) => refresh(v.id) });
}

export const useUploadImage = () =>
  useImageMutation<{ id: Guid; file: File; altText: string }>((api, v) => api.admin.uploadImage(v.id, v.file, v.altText));
export const useDeleteImage = () =>
  useImageMutation<{ id: Guid; imageId: Guid }>((api, v) => api.admin.deleteImage(v.id, v.imageId));
export const useSetPrimaryImage = () =>
  useImageMutation<{ id: Guid; imageId: Guid }>((api, v) => api.admin.setPrimaryImage(v.id, v.imageId));

export function useSetPrice() {
  const { api } = useEcommerceClients();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, currency }: { id: Guid; amount: number; currency: string }) =>
      api.admin.setPrice(id, amount, currency),
    onSuccess: (money, { id }) => queryClient.setQueryData(["price", id], money),
  });
}

export function useAdminStockList(query: PageQuery = {}) {
  const { api } = useEcommerceClients();
  return useQuery({ queryKey: ["admin", "stock", query], queryFn: () => api.admin.stockList(query) });
}

export function useAdminStock(productId: Guid) {
  const { api } = useEcommerceClients();
  return useQuery({
    queryKey: ["admin", "stock-detail", productId],
    queryFn: () => api.admin.stockDetail(productId),
    enabled: Boolean(productId),
  });
}

export function useReceiveStock() {
  const { api } = useEcommerceClients();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }: { id: Guid; quantity: number }) => api.admin.receiveStock(id, quantity),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "stock"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stock-detail"] });
    },
  });
}

export function useAdminOrders(query: AdminOrderQuery = {}) {
  const { api } = useEcommerceClients();
  return useQuery({ queryKey: ["admin", "orders", query], queryFn: () => api.admin.orders(query) });
}

export function useAdminOrder(id: Guid) {
  const { api } = useEcommerceClients();
  return useQuery({
    queryKey: ["admin", "order", id],
    queryFn: () => api.admin.order(id),
    enabled: Boolean(id),
  });
}

export type OrderAction = "cancel" | "ship" | "deliver";

export function useOrderAction() {
  const { api } = useEcommerceClients();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: Guid; action: OrderAction }) =>
      action === "cancel" ? api.admin.cancelOrder(id) : action === "ship" ? api.admin.shipOrder(id) : api.admin.deliverOrder(id),
    onSuccess: (order) => {
      queryClient.setQueryData(["admin", "order", order.id], order);
      void queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stock"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "stock-detail"] });
    },
  });
}

export function useAdminPayments(query: PageQuery = {}) {
  const { api } = useEcommerceClients();
  return useQuery({ queryKey: ["admin", "payments", query], queryFn: () => api.admin.payments(query) });
}

export function useAdminPayment(orderId: Guid) {
  const { api } = useEcommerceClients();
  return useQuery({
    queryKey: ["admin", "payment", orderId],
    queryFn: () => api.admin.paymentFor(orderId),
    enabled: Boolean(orderId),
    retry: false,
  });
}

function usePaymentRefresh() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of ["payment", "payments", "order", "orders", "stock", "stock-detail"]) {
      void queryClient.invalidateQueries({ queryKey: ["admin", key] });
    }
  };
}

export function useSettlePayment() {
  const { api } = useEcommerceClients();
  const refresh = usePaymentRefresh();
  return useMutation({ mutationFn: (input: SettlementInput) => api.admin.settlePayment(input), onSuccess: refresh });
}

export function useRefundPayment() {
  const { api } = useEcommerceClients();
  const refresh = usePaymentRefresh();
  return useMutation({ mutationFn: (input: RefundInput) => api.admin.refundPayment(input), onSuccess: refresh });
}

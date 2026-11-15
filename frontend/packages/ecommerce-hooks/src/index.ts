"use client";

import type {
  AdminProductQuery,
  CategoryInput,
  CheckoutInput,
  CreateProductInput,
  Credentials,
  Guid,
  ProductInput,
  ProductStateInput,
  PublicProductQuery,
} from "@ecommerce/api-contracts";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { EcommerceProvider, useEcommerceClients } from "./provider";

export { EcommerceProvider } from "./provider";
export * from "./admin";

export function useCategories() {
  const { api } = useEcommerceClients();
  return useQuery({ queryKey: ["categories"], queryFn: api.categories });
}

export function useProducts(query: PublicProductQuery = {}) {
  const { api } = useEcommerceClients();
  return useQuery({
    queryKey: ["products", query],
    queryFn: () => api.products(query),
  });
}

export function useProduct(id: Guid) {
  const { api } = useEcommerceClients();
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => api.product(id),
    enabled: Boolean(id),
  });
}

export function usePrice(id: Guid) {
  const { api } = useEcommerceClients();
  return useQuery({
    queryKey: ["price", id],
    queryFn: () => api.price(id),
    enabled: Boolean(id),
  });
}

export function useCartLineDetails(ids: Guid[]) {
  const { api } = useEcommerceClients();
  const products = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["product", id],
      queryFn: () => api.product(id),
    })),
  });
  const prices = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["price", id],
      queryFn: () => api.price(id),
    })),
  });
  return ids.map((id, index) => ({
    id,
    product: products[index],
    price: prices[index],
  }));
}

export function useCart(enabled = true) {
  const { api } = useEcommerceClients();
  return useQuery({ queryKey: ["cart"], queryFn: api.cart, enabled });
}

export function useSetCartLine() {
  const { api } = useEcommerceClients();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      quantity,
    }: {
      productId: Guid;
      quantity: number;
    }) => api.setCartLine(productId, quantity),
    onSuccess: (cart) => queryClient.setQueryData(["cart"], cart),
  });
}

export function useCheckout() {
  const { api } = useEcommerceClients();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckoutInput) => api.checkout(input),
    onSuccess: (order) => {
      queryClient.setQueryData(["order", order.id], order);
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useOrder(id: Guid) {
  const { api } = useEcommerceClients();
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => api.order(id),
    enabled: Boolean(id),
  });
}

export function useCancelOrder() {
  const { api } = useEcommerceClients();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: Guid) => api.cancelOrder(id),
    onSuccess: (order) => queryClient.setQueryData(["order", order.id], order),
  });
}

export function useAdminProducts(query: AdminProductQuery = {}) {
  const { api } = useEcommerceClients();
  return useQuery({
    queryKey: ["admin", "products", query],
    queryFn: () => api.admin.products(query),
  });
}

export function useAdminProduct(id: Guid) {
  const { api } = useEcommerceClients();
  return useQuery({
    queryKey: ["admin", "product", id],
    queryFn: () => api.admin.product(id),
    enabled: Boolean(id),
  });
}

export function useCreateCategory() {
  const { api } = useEcommerceClients();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput) => api.admin.createCategory(input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["categories"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "categories"] }),
      ]),
  });
}

export function useCreateProduct() {
  const { api } = useEcommerceClients();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) => api.admin.createProduct(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
  });
}

export function useUpdateProduct() {
  const { api } = useEcommerceClients();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: Guid; input: ProductInput }) =>
      api.admin.updateProduct(id, input),
    onSuccess: (product) => {
      queryClient.setQueryData(["admin", "product", product.id], product);
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });
}

export function useSetProductState() {
  const { api } = useEcommerceClients();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: Guid; input: ProductStateInput }) =>
      api.admin.setProductState(id, input),
    onSuccess: (product) => {
      queryClient.setQueryData(["admin", "product", product.id], product);
      void queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });
}

export function useSession() {
  const { session } = useEcommerceClients();
  return useQuery({
    queryKey: ["session"],
    queryFn: session.session,
    staleTime: 15_000,
  });
}

export function useLogin() {
  const { session } = useEcommerceClients();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: Credentials) => session.login(credentials),
    onSuccess: (value) => queryClient.setQueryData(["session"], value),
  });
}

export function useRegister() {
  const { session } = useEcommerceClients();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: Credentials) => session.register(credentials),
    onSuccess: (value) => queryClient.setQueryData(["session"], value),
  });
}

export function useGoogleLogin() {
  const { session } = useEcommerceClients();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credential: string) => session.google(credential),
    onSuccess: (value) => queryClient.setQueryData(["session"], value),
  });
}

export function useLogout() {
  const { session } = useEcommerceClients();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: session.logout,
    onSuccess: () => queryClient.clear(),
  });
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  unitId: string
  productCode: string
  productName: string
  unitName: string
  price: number
  quantity: number
  discount: number  // discount percentage 0–100
  vatRate: number   // VAT rate 0–100
}

interface CartState {
  cart: CartItem[]
  customerId: string | null
  warehouseId: string | null
  // actions
  addToCart: (product: {
    id: string
    code: string
    name: string
    baseUnit?: string
    baseUnitId: string
    salesPrice: number
  }) => void
  removeFromCart: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  updateDiscount: (productId: string, discount: number) => void
  updateVatRate: (productId: string, vatRate: number) => void
  setCustomerId: (id: string | null) => void
  setWarehouseId: (id: string | null) => void
  clearCart: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cart: [],
      customerId: null,
      warehouseId: null,

      addToCart: (product) =>
        set((state) => {
          const existing = state.cart.find((i) => i.productId === product.id)
          if (existing) {
            return {
              cart: state.cart.map((i) =>
                i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i,
              ),
            }
          }
          return {
            cart: [
              ...state.cart,
              {
                productId: product.id,
                unitId: product.baseUnitId,
                productCode: product.code,
                productName: product.name,
                unitName: product.baseUnit ?? 'Cái',
                price: product.salesPrice,
                quantity: 1,
                discount: 0,
                vatRate: 0,
              },
            ],
          }
        }),

      removeFromCart: (productId) =>
        set((state) => ({ cart: state.cart.filter((i) => i.productId !== productId) })),

      updateQty: (productId, qty) =>
        set((state) => ({
          cart: state.cart.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)),
        })),

      updateDiscount: (productId, discount) =>
        set((state) => ({
          cart: state.cart.map((i) => (i.productId === productId ? { ...i, discount } : i)),
        })),

      updateVatRate: (productId, vatRate) =>
        set((state) => ({
          cart: state.cart.map((i) => (i.productId === productId ? { ...i, vatRate } : i)),
        })),

      setCustomerId: (id) => set({ customerId: id }),
      setWarehouseId: (id) => set({ warehouseId: id }),

      clearCart: () => set({ cart: [], customerId: null }),
    }),
    { name: 'pos-cart' },
  ),
)

/** Compute line net = price * qty * (1 - discount/100) */
export const lineNet = (item: CartItem) => item.price * item.quantity * (1 - item.discount / 100)

/** Compute line VAT = lineNet * vatRate/100 */
export const lineVat = (item: CartItem) => lineNet(item) * (item.vatRate / 100)

/** Compute line total = lineNet + lineVat */
export const lineTotal = (item: CartItem) => lineNet(item) + lineVat(item)

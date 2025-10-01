import { supabaseAdmin } from './supabase'

const MAX_ACTIVE_PURCHASES = 3
const MAX_NUMBERS_PER_PURCHASE = 50

export type PurchaseLimitCheck = {
  canPurchase: boolean
  reason?: string
  activePurchases?: number
  maxPurchases?: number
  nextAvailableAt?: string
  hoursRemaining?: number
}

/**
 * Verifica si un usuario puede hacer una nueva compra
 */
export async function checkPurchaseLimits(
  userId: string,
  numberCount: number
): Promise<PurchaseLimitCheck> {
  const admin = supabaseAdmin()

  // 1. Validar cantidad de números
  if (numberCount > MAX_NUMBERS_PER_PURCHASE) {
    return {
      canPurchase: false,
      reason: `No podés comprar más de ${MAX_NUMBERS_PER_PURCHASE} números por vez`,
    }
  }

  // 2. Contar órdenes activas (pending, awaiting_proof, under_review)
  const { data: activeOrders, error: countError } = await admin
    .from('orders')
    .select('id, created_at')
    .eq('user_id', userId)
    .in('status', ['pending', 'awaiting_proof', 'under_review'])

  if (countError) {
    console.error('Error contando órdenes activas:', countError)
    return {
      canPurchase: false,
      reason: 'Error al verificar tus compras anteriores',
    }
  }

  const activePurchases = activeOrders?.length || 0

  // 3. Verificar límite de compras activas
  if (activePurchases >= MAX_ACTIVE_PURCHASES) {
    return {
      canPurchase: false,
      reason: `Ya tenés ${MAX_ACTIVE_PURCHASES} compras activas. Esperá a que se confirmen o rechacen.`,
      activePurchases,
      maxPurchases: MAX_ACTIVE_PURCHASES,
    }
  }

  // ✅ Todo OK, puede comprar
  return {
    canPurchase: true,
    activePurchases,
    maxPurchases: MAX_ACTIVE_PURCHASES,
  }
}

/**
 * Actualiza el contador de compras activas de un usuario
 */
export async function updateActivePurchasesCount(userId: string) {
  const admin = supabaseAdmin()

  const { data: activeOrders } = await admin
    .from('orders')
    .select('id')
    .eq('user_id', userId)
    .in('status', ['pending', 'awaiting_proof', 'under_review'])

  const count = activeOrders?.length || 0

  await admin
    .from('app_users')
    .update({ active_purchases_count: count })
    .eq('id', userId)
}
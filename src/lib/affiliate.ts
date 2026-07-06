// EvidenceHub Sleep — Affiliate Module
// Manages product data, affiliate links, and price/stock updates.
// Supports Amazon (via PA API) and iHerb (via scraping or API).

import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { Product, ClaimProduct } from "./types";

// ============================================================
// Product queries
// ============================================================

export async function getProductsByClaimSlug(slug: string): Promise<(ClaimProduct & { product: Product })[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = getSupabase()!;
  const { data: claimData } = await supabase
    .from("claims")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!claimData) return [];

  const { data, error } = await supabase
    .from("claim_products")
    .select("*, product:products(*)")
    .eq("claim_id", claimData.id)
    .order("match_score", { ascending: false });

  if (error || !data) return [];
  return data as (ClaimProduct & { product: Product })[];
}

export async function getAllProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = getSupabase()!;
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as Product[];
}

// ============================================================
// Price/stock update (Job 6 — weekly)
// ============================================================

export interface AffiliateUpdateResult {
  productsChecked: number;
  pricesUpdated: number;
  errors: string[];
  timestamp: string;
}

/**
 * Job 6: Update affiliate product prices and stock status.
 * Runs weekly (Monday). Checks Amazon PA API and iHerb.
 *
 * NOTE: This is a skeleton implementation. To enable:
 * - Amazon: Set AMAZON_PA_ACCESS_KEY, AMAZON_PA_SECRET_KEY, AMAZON_PA_TAG
 * - iHerb: Set IHERB_API_KEY (if available) or use web scraping
 */
export async function jobUpdateAffiliate(): Promise<AffiliateUpdateResult> {
  const result: AffiliateUpdateResult = {
    productsChecked: 0,
    pricesUpdated: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  };

  console.log("[Job 6: affiliate-update] Starting affiliate price/stock update...");

  if (!isSupabaseConfigured) {
    console.log("[Job 6] Supabase not configured. Skipping.");
    return result;
  }

  const products = await getAllProducts();
  result.productsChecked = products.length;

  if (products.length === 0) {
    console.log("[Job 6] No products to update.");
    return result;
  }

  const amazonKey = process.env.AMAZON_PA_ACCESS_KEY;
  const iherbKey = process.env.IHERB_API_KEY;

  for (const product of products) {
    try {
      let updated = false;

      // Amazon price update
      if (product.asin && amazonKey) {
        const amazonPrice = await fetchAmazonPrice(product.asin);
        if (amazonPrice !== null && amazonPrice !== product.price) {
          await updateProductPrice(product.id, amazonPrice);
          result.pricesUpdated++;
          updated = true;
          console.log(`  [Amazon] ${product.name}: ${product.price} → ${amazonPrice}`);
        }
      }

      // iHerb stock check
      if (product.iherbId && iherbKey) {
        const iherbInfo = await fetchIherbStock(product.iherbId);
        if (iherbInfo) {
          console.log(`  [iHerb] ${product.name}: ${iherbInfo.inStock ? "In stock" : "Out of stock"}`);
        }
      }

      if (!updated && !product.asin && !product.iherbId) {
        console.log(`  [SKIP] ${product.name}: No ASIN or iHerb ID`);
      }
    } catch (err) {
      result.errors.push(`Update failed for ${product.name}: ${err}`);
    }
  }

  console.log(`[Job 6] Complete. Checked: ${result.productsChecked}, Updated: ${result.pricesUpdated}`);
  return result;
}

// ============================================================
// Amazon Product Advertising API (skeleton)
// ============================================================

async function fetchAmazonPrice(asin: string): Promise<number | null> {
  // TODO: Implement Amazon PA API 5.0 call
  // Requires: AWS Signature V4, Amazon PA API credentials
  // Reference: https://webservices.amazon.com/paapi5/documentation/
  //
  // Example:
  //   const client = new ProductAdvertisingAPIv1.DefaultApi();
  //   const result = await client.getItems({ itemIds: [asin], ... });
  //   return result.itemsResult?.items?.[0]?.offers?.listings?.[0]?.price?.amount;

  console.log(`  [Amazon] Price check for ASIN ${asin} — not implemented (skeleton)`);
  return null;
}

// ============================================================
// iHerb API (skeleton)
// ============================================================

async function fetchIherbStock(iherbId: string): Promise<{ inStock: boolean; price?: number } | null> {
  // TODO: Implement iHerb stock check
  // iHerb does not have a public API; options:
  // 1. Use a third-party scraping service
  // 2. Use iHerb's affiliate API (if available)
  // 3. Manual price tracking via periodic checks

  console.log(`  [iHerb] Stock check for ID ${iherbId} — not implemented (skeleton)`);
  return null;
}

// ============================================================
// DB helpers
// ============================================================

async function updateProductPrice(productId: string, price: number): Promise<void> {
  if (!isSupabaseConfigured) return;

  const supabase = getSupabase()!;
  const { error } = await supabase
    .from("products")
    .update({ price, updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (error) {
    console.error(`[Affiliate] Failed to update price for ${productId}:`, error);
  }
}

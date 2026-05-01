// ============================================
// TYPES POUR LE SYSTÈME DE VARIANTES DE PRODUITS
// ============================================

import { Product, ColorWithHex } from './index';

// Option de variante (ex: "Taille", "Couleur", "Matière")
export interface VariantOption {
  id: string;
  productId: string;
  name: string;
  position: number;
  values: VariantOptionValue[];
}

// Valeur d'option (ex: "S", "M", "L" ou "Rouge", "Bleu")
export interface VariantOptionValue {
  id: string;
  optionId: string;
  value: string;
  hexColor?: string; // Uniquement pour les couleurs
  position: number;
}

// Variante de produit (combinaison unique, ex: "T-Shirt S Rouge")
export interface ProductVariant {
  id: string;
  productId: string;
  sku: string | null;
  barcode?: string;
  price: number | null; // null = utiliser prix du produit parent
  compareAtPrice?: number;
  costPrice?: number;
  stock: number;
  weight?: number;
  isAvailable: boolean;
  images?: string[]; // Tableau d'images (comme pour les produits)
  colors?: ColorWithHex[]; // Couleurs associées à cette variante
  /** Tailles disponibles pour cette variante (variantes par image, etc.) */
  sizes?: string[];
  position: number;
  options: SelectedVariantOption[]; // Les options sélectionnées
  createdAt: string;
  updatedAt: string;
}

// Option sélectionnée pour une variante
export interface SelectedVariantOption {
  optionId: string;
  optionName: string;
  valueId: string;
  value: string;
  hexColor?: string;
}

// Produit avec variantes (extension du Product existant)
export interface ProductWithVariants extends Omit<Product, 'stock'> {
  hasVariants: boolean;
  variantOptions: VariantOption[];
  variants: ProductVariant[];
  totalStock: number; // Somme des stocks de toutes les variantes (ou stock du produit si pas de variantes)
  priceRange: {
    min: number;
    max: number;
  };
  // Stock original du produit (pour les produits sans variantes)
  stock: number;
}

// Type pour le panier avec variantes
export interface CartItemWithVariant {
  id: string;
  productId: string;
  variantId: string | null; // ID de la variante spécifique (null si pas de variantes)
  product: Product;
  variant: ProductVariant | null;
  size: string | null; // Conservé pour compatibilité
  color: string | null; // Conservé pour compatibilité
  quantity: number;
  unitPrice: number; // Prix de la variante au moment de l'ajout
}

// Types pour la base de données (format snake_case)
export interface DatabaseVariantOption {
  id: string;
  product_id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface DatabaseVariantOptionValue {
  id: string;
  option_id: string;
  value: string;
  hex_color: string | null;
  position: number;
  created_at: string;
}

export interface DatabaseProductVariant {
  id: string;
  product_id: string;
  sku: string | null;
  barcode: string | null;
  price: number | null;
  compare_at_price: number | null;
  cost_price: number | null;
  stock: number;
  weight: number | null;
  is_available: boolean;
  images: string[] | null; // Tableau d'images au lieu de image_url
  colors: string[] | null; // Couleurs JSON sérialisées (ex: '{"name":"Marron","hex":"#8B4513"}')
  sizes: string[] | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface DatabaseProductVariantOption {
  id: string;
  variant_id: string;
  option_value_id: string;
}

// Types pour les formulaires admin
export interface VariantOptionFormData {
  id?: string;
  name: string;
  values: VariantOptionValueFormData[];
}

export interface VariantOptionValueFormData {
  id?: string;
  value: string;
  hexColor?: string;
}

export interface VariantFormData {
  id?: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  costPrice: string;
  stock: string;
  weight: string;
  isAvailable: boolean;
  images: string[]; // Tableau d'images au lieu de imageUrl
  options: Record<string, string>; // optionId -> valueId
}

// Pour générer toutes les combinaisons de variantes
export interface VariantCombination {
  options: Array<{
    optionId: string;
    optionName: string;
    valueId: string;
    value: string;
    hexColor?: string;
  }>;
  displayName: string; // ex: "S / Rouge"
}

// Utilitaires de conversion
export function dbToVariantOption(db: DatabaseVariantOption, values: VariantOptionValue[]): VariantOption {
  return {
    id: db.id,
    productId: db.product_id,
    name: db.name,
    position: db.position,
    values
  };
}

export function dbToVariantOptionValue(db: DatabaseVariantOptionValue): VariantOptionValue {
  return {
    id: db.id,
    optionId: db.option_id,
    value: db.value,
    hexColor: db.hex_color || undefined,
    position: db.position
  };
}

export function dbToProductVariant(
  db: DatabaseProductVariant,
  options: SelectedVariantOption[]
): ProductVariant {
  // Parser les couleurs depuis le format JSON sérialisé
  let colors: ColorWithHex[] | undefined;
  if (Array.isArray(db.colors) && db.colors.length > 0) {
    colors = db.colors
      .map((raw) => {
        try {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (parsed && parsed.name && parsed.hex) return { name: parsed.name, hex: parsed.hex };
        } catch { /* ignore */ }
        return null;
      })
      .filter((c): c is ColorWithHex => c !== null);
    if (colors.length === 0) colors = undefined;
  }

  let sizes: string[] | undefined;
  if (Array.isArray(db.sizes) && db.sizes.length > 0) {
    sizes = db.sizes.map((s) => String(s).trim()).filter(Boolean);
    if (sizes.length === 0) sizes = undefined;
  }

  return {
    id: db.id,
    productId: db.product_id,
    sku: db.sku,
    barcode: db.barcode || undefined,
    price: db.price,
    compareAtPrice: db.compare_at_price || undefined,
    costPrice: db.cost_price || undefined,
    stock: db.stock,
    weight: db.weight || undefined,
    isAvailable: db.is_available,
    images: Array.isArray(db.images) ? db.images : (db.images ? [db.images] : undefined),
    colors,
    sizes,
    position: db.position,
    options,
    createdAt: db.created_at,
    updatedAt: db.updated_at
  };
}

// Génère le nom d'affichage d'une variante (ex: "S / Rouge")
export function getVariantDisplayName(variant: ProductVariant): string {
  return variant.options.map(o => o.value).join(' / ');
}

// Calcule le prix effectif d'une variante
export function getEffectivePrice(variant: ProductVariant, basePrice: number): number {
  return variant.price ?? basePrice;
}

// Vérifie si une variante est en stock
export function isVariantInStock(variant: ProductVariant): boolean {
  return variant.isAvailable && variant.stock > 0;
}

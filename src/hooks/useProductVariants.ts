import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ProductVariant, 
  VariantOption, 
  VariantOptionValue,
  SelectedVariantOption,
  VariantCombination,
  VariantOptionFormData,
  VariantFormData
} from '../types/variants';
import toast from 'react-hot-toast';

interface UseProductVariantsResult {
  variants: ProductVariant[];
  options: VariantOption[];
  isLoading: boolean;
  error: string | null;
  loadVariants: () => Promise<void>;
  generateCombinations: () => VariantCombination[];
  findVariant: (selectedOptions: Record<string, string>) => ProductVariant | null;
  getTotalStock: () => number;
  getPriceRange: (basePrice: number) => { min: number; max: number };
  // CRUD operations
  saveOption: (option: VariantOptionFormData) => Promise<VariantOption | null>;
  deleteOption: (optionId: string) => Promise<boolean>;
  saveVariant: (variant: VariantFormData, productId: string) => Promise<ProductVariant | null>;
  deleteVariant: (variantId: string) => Promise<boolean>;
  generateAllVariants: (productId: string, basePrice: number) => Promise<boolean>;
}

export function useProductVariants(productId: string | null): UseProductVariantsResult {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [options, setOptions] = useState<VariantOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les options et variantes
  const loadVariants = useCallback(async () => {
    if (!productId) {
      setOptions([]);
      setVariants([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Charger les options avec leurs valeurs
      const { data: optionsData, error: optionsError } = await supabase
        .from('variant_options')
        .select(`
          id,
          product_id,
          name,
          position,
          variant_option_values (
            id,
            option_id,
            value,
            hex_color,
            position
          )
        `)
        .eq('product_id', productId)
        .order('position');

      if (optionsError) throw optionsError;

      // Charger les variantes avec leurs options
      const { data: variantsData, error: variantsError } = await supabase
        .from('product_variants')
        .select(`
          id,
          product_id,
          sku,
          barcode,
          price,
          compare_at_price,
          cost_price,
          stock,
          weight,
          is_available,
          images,
          position,
          created_at,
          updated_at,
          product_variant_options (
            id,
            option_value_id
          )
        `)
        .eq('product_id', productId)
        .order('position');

      if (variantsError) throw variantsError;

      // Transformer les options
      const transformedOptions: VariantOption[] = (optionsData || []).map(opt => ({
        id: opt.id,
        productId: opt.product_id,
        name: opt.name,
        position: opt.position,
        values: (opt.variant_option_values || [])
          .map((v: any) => ({
            id: v.id,
            optionId: v.option_id,
            value: v.value,
            hexColor: v.hex_color || undefined,
            position: v.position
          }))
          .sort((a: VariantOptionValue, b: VariantOptionValue) => a.position - b.position)
      }));

      // Créer un map des valeurs d'options pour lookup rapide
      const valueMap = new Map<string, { option: VariantOption; value: VariantOptionValue }>();
      transformedOptions.forEach(opt => {
        opt.values.forEach(val => {
          valueMap.set(val.id, { option: opt, value: val });
        });
      });

      // Transformer les variantes
      const transformedVariants: ProductVariant[] = (variantsData || []).map(v => {
        const selectedOptions: SelectedVariantOption[] = (v.product_variant_options || [])
          .map((pvo: any) => {
            const lookup = valueMap.get(pvo.option_value_id);
            if (!lookup) return null;
            return {
              optionId: lookup.option.id,
              optionName: lookup.option.name,
              valueId: lookup.value.id,
              value: lookup.value.value,
              hexColor: lookup.value.hexColor
            };
          })
          .filter((o): o is SelectedVariantOption => o !== null)
          .sort((a, b) => {
            const optA = transformedOptions.find(o => o.id === a.optionId);
            const optB = transformedOptions.find(o => o.id === b.optionId);
            return (optA?.position ?? 0) - (optB?.position ?? 0);
          });

        return {
          id: v.id,
          productId: v.product_id,
          sku: v.sku,
          barcode: v.barcode || undefined,
          price: v.price,
          compareAtPrice: v.compare_at_price || undefined,
          costPrice: v.cost_price || undefined,
          stock: v.stock,
          weight: v.weight || undefined,
          isAvailable: v.is_available,
          images: Array.isArray(v.images) ? v.images : (v.images ? [v.images] : undefined),
          position: v.position,
          options: selectedOptions,
          createdAt: v.created_at,
          updatedAt: v.updated_at
        };
      });

      setOptions(transformedOptions);
      setVariants(transformedVariants);
    } catch (err: any) {
      console.error('Erreur lors du chargement des variantes:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  // Générer toutes les combinaisons possibles
  const generateCombinations = useCallback((): VariantCombination[] => {
    if (options.length === 0) return [];

    const combine = (
      optionIndex: number,
      current: VariantCombination['options']
    ): VariantCombination[] => {
      if (optionIndex >= options.length) {
        return [{
          options: current,
          displayName: current.map(o => o.value).join(' / ')
        }];
      }

      const option = options[optionIndex];
      const results: VariantCombination[] = [];

      for (const value of option.values) {
        const newCurrent = [
          ...current,
          {
            optionId: option.id,
            optionName: option.name,
            valueId: value.id,
            value: value.value,
            hexColor: value.hexColor
          }
        ];
        results.push(...combine(optionIndex + 1, newCurrent));
      }

      return results;
    };

    return combine(0, []);
  }, [options]);

  // Trouver une variante par ses options sélectionnées
  const findVariant = useCallback((
    selectedOptions: Record<string, string>
  ): ProductVariant | null => {
    const selectedValues = Object.values(selectedOptions);
    if (selectedValues.length === 0) return null;

    return variants.find(variant => {
      if (variant.options.length !== selectedValues.length) return false;
      return variant.options.every(opt => 
        selectedOptions[opt.optionId] === opt.valueId
      );
    }) || null;
  }, [variants]);

  // Calculer le stock total
  const getTotalStock = useCallback((): number => {
    return variants
      .filter(v => v.isAvailable)
      .reduce((sum, v) => sum + v.stock, 0);
  }, [variants]);

  // Calculer la plage de prix
  const getPriceRange = useCallback((basePrice: number): { min: number; max: number } => {
    const availableVariants = variants.filter(v => v.isAvailable);
    if (availableVariants.length === 0) {
      return { min: basePrice, max: basePrice };
    }
    
    const prices = availableVariants.map(v => v.price ?? basePrice);
    
    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    };
  }, [variants]);

  // Sauvegarder une option
  const saveOption = useCallback(async (
    optionData: VariantOptionFormData
  ): Promise<VariantOption | null> => {
    if (!productId) return null;

    try {
      let optionId = optionData.id;

      // Créer ou mettre à jour l'option
      if (optionId) {
        const { error } = await supabase
          .from('variant_options')
          .update({ name: optionData.name })
          .eq('id', optionId);
        if (error) throw error;
      } else {
        const maxPosition = options.length > 0 
          ? Math.max(...options.map(o => o.position)) + 1 
          : 0;
        
        const { data, error } = await supabase
          .from('variant_options')
          .insert({
            product_id: productId,
            name: optionData.name,
            position: maxPosition
          })
          .select()
          .single();
        
        if (error) throw error;
        optionId = data.id;
      }

      // Gérer les valeurs
      const existingValues = options.find(o => o.id === optionId)?.values || [];
      const existingIds = new Set(existingValues.map(v => v.id));
      const newIds = new Set(optionData.values.filter(v => v.id).map(v => v.id));

      // Supprimer les valeurs qui ne sont plus présentes
      const toDelete = existingValues.filter(v => !newIds.has(v.id));
      for (const val of toDelete) {
        await supabase.from('variant_option_values').delete().eq('id', val.id);
      }

      // Créer ou mettre à jour les valeurs
      for (let i = 0; i < optionData.values.length; i++) {
        const val = optionData.values[i];
        if (val.id && existingIds.has(val.id)) {
          await supabase
            .from('variant_option_values')
            .update({ 
              value: val.value, 
              hex_color: val.hexColor || null,
              position: i 
            })
            .eq('id', val.id);
        } else {
          await supabase
            .from('variant_option_values')
            .insert({
              option_id: optionId,
              value: val.value,
              hex_color: val.hexColor || null,
              position: i
            });
        }
      }

      await loadVariants();
      toast.success('Option sauvegardée');
      return options.find(o => o.id === optionId) || null;
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde de l\'option:', err);
      toast.error(err.message || 'Erreur lors de la sauvegarde');
      return null;
    }
  }, [productId, options, loadVariants]);

  // Supprimer une option
  const deleteOption = useCallback(async (optionId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('variant_options')
        .delete()
        .eq('id', optionId);
      
      if (error) throw error;
      
      await loadVariants();
      toast.success('Option supprimée');
      return true;
    } catch (err: any) {
      console.error('Erreur lors de la suppression de l\'option:', err);
      toast.error(err.message || 'Erreur lors de la suppression');
      return false;
    }
  }, [loadVariants]);

  // Sauvegarder une variante
  const saveVariant = useCallback(async (
    variantData: VariantFormData,
    prodId: string
  ): Promise<ProductVariant | null> => {
    try {
      const variantPayload = {
        product_id: prodId,
        sku: variantData.sku || null,
        price: variantData.price ? parseFloat(variantData.price) : null,
        compare_at_price: variantData.compareAtPrice ? parseFloat(variantData.compareAtPrice) : null,
        cost_price: variantData.costPrice ? parseFloat(variantData.costPrice) : null,
        stock: variantData.stock ? parseInt(variantData.stock) : 0,
        weight: variantData.weight ? parseFloat(variantData.weight) : null,
        is_available: variantData.isAvailable,
        images: Array.isArray(variantData.images) && variantData.images.length > 0 
          ? variantData.images.filter(img => img.trim()) 
          : []
      };

      let variantId = variantData.id;

      if (variantId) {
        // Mise à jour
        const { error } = await supabase
          .from('product_variants')
          .update(variantPayload)
          .eq('id', variantId);
        if (error) throw error;

        // Supprimer les anciennes liaisons
        await supabase
          .from('product_variant_options')
          .delete()
          .eq('variant_id', variantId);
      } else {
        // Création
        const maxPosition = variants.length > 0 
          ? Math.max(...variants.map(v => v.position)) + 1 
          : 0;
        
        const { data, error } = await supabase
          .from('product_variants')
          .insert({ ...variantPayload, position: maxPosition })
          .select()
          .single();
        
        if (error) throw error;
        variantId = data.id;
      }

      // Créer les liaisons avec les valeurs d'options
      const optionLinks = Object.values(variantData.options).map(valueId => ({
        variant_id: variantId,
        option_value_id: valueId
      }));

      if (optionLinks.length > 0) {
        const { error } = await supabase
          .from('product_variant_options')
          .insert(optionLinks);
        if (error) throw error;
      }

      await loadVariants();
      toast.success('Variante sauvegardée');
      return variants.find(v => v.id === variantId) || null;
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde de la variante:', err);
      toast.error(err.message || 'Erreur lors de la sauvegarde');
      return null;
    }
  }, [variants, loadVariants]);

  // Supprimer une variante
  const deleteVariant = useCallback(async (variantId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', variantId);
      
      if (error) throw error;
      
      await loadVariants();
      toast.success('Variante supprimée');
      return true;
    } catch (err: any) {
      console.error('Erreur lors de la suppression de la variante:', err);
      toast.error(err.message || 'Erreur lors de la suppression');
      return false;
    }
  }, [loadVariants]);

  // Générer automatiquement toutes les variantes
  const generateAllVariants = useCallback(async (
    prodId: string,
    basePrice: number
  ): Promise<boolean> => {
    try {
      const combinations = generateCombinations();
      if (combinations.length === 0) {
        toast.error('Aucune combinaison à générer. Ajoutez des options d\'abord.');
        return false;
      }

      // Identifier les combinaisons existantes
      const existingCombos = new Set(
        variants.map(v => 
          v.options.map(o => o.valueId).sort().join('-')
        )
      );

      // Créer les nouvelles variantes
      let created = 0;
      for (let i = 0; i < combinations.length; i++) {
        const combo = combinations[i];
        const comboKey = combo.options.map(o => o.valueId).sort().join('-');
        
        if (existingCombos.has(comboKey)) continue;

        const sku = combo.options.map(o => o.value.substring(0, 3).toUpperCase()).join('-');
        
        const variantData: VariantFormData = {
          sku: `${prodId.substring(0, 4)}-${sku}-${i}`,
          price: '',
          compareAtPrice: '',
          costPrice: '',
          stock: '0',
          weight: '',
          isAvailable: true,
          imageUrl: '',
          options: combo.options.reduce((acc, o) => {
            acc[o.optionId] = o.valueId;
            return acc;
          }, {} as Record<string, string>)
        };

        await saveVariant(variantData, prodId);
        created++;
      }

      if (created > 0) {
        toast.success(`${created} variante(s) créée(s)`);
      } else {
        toast.info('Toutes les variantes existent déjà');
      }
      
      return true;
    } catch (err: any) {
      console.error('Erreur lors de la génération des variantes:', err);
      toast.error(err.message || 'Erreur lors de la génération');
      return false;
    }
  }, [generateCombinations, variants, saveVariant]);

  // Charger au montage
  useEffect(() => {
    if (productId) {
      loadVariants();
    }
  }, [productId, loadVariants]);

  return {
    variants,
    options,
    isLoading,
    error,
    loadVariants,
    generateCombinations,
    findVariant,
    getTotalStock,
    getPriceRange,
    saveOption,
    deleteOption,
    saveVariant,
    deleteVariant,
    generateAllVariants
  };
}

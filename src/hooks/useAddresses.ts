import { useState, useEffect } from 'react';
import { Address } from '../types';
import { supabase } from '../lib/supabase';

interface DatabaseAddress {
  id: string;
  user_id: string;
  label: string;
  first_name: string;
  last_name: string;
  street: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useAddresses() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Convertit une adresse du format base de données vers le format frontend
   */
  const adaptDatabaseAddressToAddress = (dbAddress: DatabaseAddress): Address => {
    return {
      id: dbAddress.id,
      label: dbAddress.label,
      firstName: dbAddress.first_name,
      lastName: dbAddress.last_name,
      street: dbAddress.street,
      city: dbAddress.city,
      postalCode: dbAddress.postal_code,
      country: dbAddress.country,
      phone: dbAddress.phone,
      isDefault: dbAddress.is_default,
    };
  };

  /**
   * Récupère toutes les adresses d'un utilisateur
   */
  const getUserAddresses = async (userId: string): Promise<Address[]> => {
    try {
      setIsLoading(true);
      setError(null);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.error('ID utilisateur invalide (pas un UUID):', userId);
        setError('ID utilisateur invalide');
        return [];
      }

      const { data, error: supabaseError } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (supabaseError) {
        console.error('Erreur lors de la récupération des adresses:', supabaseError);
        setError(supabaseError.message || 'Erreur lors de la récupération des adresses');
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((dbAddress) => adaptDatabaseAddressToAddress(dbAddress as DatabaseAddress));
    } catch (err: any) {
      console.error('Erreur lors de la récupération des adresses:', err);
      setError(err.message || 'Erreur lors de la récupération des adresses');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Crée une nouvelle adresse
   */
  const createAddress = async (userId: string, address: Omit<Address, 'id'>): Promise<Address | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.error('ID utilisateur invalide (pas un UUID):', userId);
        setError('ID utilisateur invalide');
        return null;
      }

      // Si cette adresse est définie comme par défaut, désactiver les autres
      if (address.isDefault) {
        await supabase
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', userId)
          .eq('is_default', true);
      }

      const addressData = {
        user_id: userId,
        label: address.label,
        first_name: address.firstName,
        last_name: address.lastName,
        street: address.street,
        city: address.city,
        postal_code: address.postalCode,
        country: address.country,
        phone: address.phone,
        is_default: address.isDefault || false,
      };

      const { data, error: supabaseError } = await supabase
        .from('user_addresses')
        .insert(addressData)
        .select()
        .single();

      if (supabaseError) {
        console.error('Erreur lors de la création de l\'adresse:', supabaseError);
        setError(supabaseError.message || 'Erreur lors de la création de l\'adresse');
        return null;
      }

      if (!data) {
        setError('Aucune donnée retournée lors de la création de l\'adresse');
        return null;
      }

      return adaptDatabaseAddressToAddress(data as DatabaseAddress);
    } catch (err: any) {
      console.error('Erreur lors de la création de l\'adresse:', err);
      setError(err.message || 'Erreur lors de la création de l\'adresse');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Met à jour une adresse existante
   */
  const updateAddress = async (addressId: string, userId: string, address: Partial<Omit<Address, 'id'>>): Promise<Address | null> => {
    try {
      setIsLoading(true);
      setError(null);

      // Si cette adresse est définie comme par défaut, désactiver les autres
      if (address.isDefault) {
        await supabase
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', userId)
          .eq('is_default', true)
          .neq('id', addressId);
      }

      const updateData: any = {};
      if (address.label !== undefined) updateData.label = address.label;
      if (address.firstName !== undefined) updateData.first_name = address.firstName;
      if (address.lastName !== undefined) updateData.last_name = address.lastName;
      if (address.street !== undefined) updateData.street = address.street;
      if (address.city !== undefined) updateData.city = address.city;
      if (address.postalCode !== undefined) updateData.postal_code = address.postalCode;
      if (address.country !== undefined) updateData.country = address.country;
      if (address.phone !== undefined) updateData.phone = address.phone;
      if (address.isDefault !== undefined) updateData.is_default = address.isDefault;

      const { data, error: supabaseError } = await supabase
        .from('user_addresses')
        .update(updateData)
        .eq('id', addressId)
        .eq('user_id', userId)
        .select()
        .single();

      if (supabaseError) {
        console.error('Erreur lors de la mise à jour de l\'adresse:', supabaseError);
        setError(supabaseError.message || 'Erreur lors de la mise à jour de l\'adresse');
        return null;
      }

      if (!data) {
        setError('Aucune donnée retournée lors de la mise à jour de l\'adresse');
        return null;
      }

      return adaptDatabaseAddressToAddress(data as DatabaseAddress);
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour de l\'adresse:', err);
      setError(err.message || 'Erreur lors de la mise à jour de l\'adresse');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Supprime une adresse
   */
  const deleteAddress = async (addressId: string, userId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const { error: supabaseError } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', userId);

      if (supabaseError) {
        console.error('Erreur lors de la suppression de l\'adresse:', supabaseError);
        setError(supabaseError.message || 'Erreur lors de la suppression de l\'adresse');
        return false;
      }

      return true;
    } catch (err: any) {
      console.error('Erreur lors de la suppression de l\'adresse:', err);
      setError(err.message || 'Erreur lors de la suppression de l\'adresse');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    addresses,
    isLoading,
    error,
    getUserAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setAddresses,
  };
}


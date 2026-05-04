import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';

/**
 * Hook to check if products are in the wishlist based on external IDs from login
 * When logged out, external IDs are cleared so heart icons show as unliked
 */
export const useWishlistStatus = () => {
  const [externalIds, setExternalIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  const externalIdsSet = useMemo(() => new Set(externalIds), [externalIds]);

  // Load external IDs on mount and when auth status changes
  useEffect(() => {
    const loadExternalIds = async () => {
      if (!isAuthenticated) {
        // When logged out, clear external IDs from state so heart icons show as unliked
        setExternalIds([]);
        setIsLoading(false);
        return;
      }

      try {
        const storedIds = await AsyncStorage.getItem(STORAGE_KEYS.WISHLIST_EXTERNAL_IDS);
        if (storedIds) {
          const parsedIds = JSON.parse(storedIds);
          // Convert all IDs to strings for consistent comparison
          const stringIds = Array.isArray(parsedIds) 
            ? parsedIds.map(id => id?.toString() || '')
            : [];
          const filteredIds = stringIds.filter(Boolean);
          setExternalIds(filteredIds);
        } else {
          setExternalIds([]);
        }
      } catch (error) {
        setExternalIds([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadExternalIds();
  }, [isAuthenticated]); // Only depend on isAuthenticated

  // Refresh external IDs (call this after adding/removing from wishlist)
  const refreshExternalIds = useCallback(async () => {
    try {
      const storedIds = await AsyncStorage.getItem(STORAGE_KEYS.WISHLIST_EXTERNAL_IDS);
      if (storedIds) {
        const parsedIds = JSON.parse(storedIds);
        const stringIds = Array.isArray(parsedIds) 
          ? parsedIds.map(id => id?.toString() || '')
          : [];
        setExternalIds(stringIds.filter(Boolean));
      } else {
        setExternalIds([]);
      }
    } catch (error) {
      // Error refreshing external IDs
    }
  }, []);

  // Removed periodic storage check to avoid infinite loops
  // External IDs are updated via:
  // 1. Initial load on mount/auth change (useEffect above)
  // 2. refreshExternalIds() called after API operations
  // 3. Optimistic updates via addExternalId/removeExternalId

  // Check if a product is liked by comparing its ID with external IDs
  const isProductLiked = useCallback((product: Product | any): boolean => {
    // If user is logged out, don't compare - return false immediately
    if (!isAuthenticated) {
      return false;
    }

    if (!product || externalIdsSet.size === 0) {
      return false;
    }

    // Try to get product ID from various possible fields
    const productId = 
      (product as any).offerId?.toString() ||
      (product as any).externalId?.toString() ||
      product.id?.toString() ||
      product._id?.toString() ||
      '';

    if (!productId) {
      return false;
    }

    // Check if product ID matches any external ID
    return externalIdsSet.has(productId);
  }, [externalIdsSet, isAuthenticated]);

  // Add external ID immediately (optimistic update) - also saves to AsyncStorage
  const addExternalId = useCallback(async (externalId: string) => {
    const idString = externalId.toString();
    
    // Update state immediately
    setExternalIds(prev => {
      if (prev.includes(idString)) {
        return prev; // Already exists
      }
      return [...prev, idString];
    });
    
    // Also save to AsyncStorage immediately
    try {
      const currentIds = await AsyncStorage.getItem(STORAGE_KEYS.WISHLIST_EXTERNAL_IDS);
      let existingIds: string[] = [];
      if (currentIds) {
        const parsed = JSON.parse(currentIds);
        existingIds = Array.isArray(parsed) ? parsed.map((id: any) => id?.toString() || '').filter(Boolean) : [];
      }
      
      if (!existingIds.includes(idString)) {
        existingIds.push(idString);
        await AsyncStorage.setItem(STORAGE_KEYS.WISHLIST_EXTERNAL_IDS, JSON.stringify(existingIds));
      }
    } catch (error) {
      // Error adding external ID to AsyncStorage
    }
  }, []);

  // Remove external ID immediately (optimistic update) - also removes from AsyncStorage
  const removeExternalId = useCallback(async (externalId: string) => {
    const idString = externalId.toString();
    
    // Update state immediately
    setExternalIds(prev => prev.filter(id => id !== idString));
    
    // Also remove from AsyncStorage immediately
    try {
      const currentIds = await AsyncStorage.getItem(STORAGE_KEYS.WISHLIST_EXTERNAL_IDS);
      if (currentIds) {
        const parsed = JSON.parse(currentIds);
        const existingIds = Array.isArray(parsed) ? parsed.map((id: any) => id?.toString() || '').filter(Boolean) : [];
        const updatedIds = existingIds.filter((id: string) => id !== idString);
        await AsyncStorage.setItem(STORAGE_KEYS.WISHLIST_EXTERNAL_IDS, JSON.stringify(updatedIds));
      }
    } catch (error) {
      // Error removing external ID from AsyncStorage
    }
  }, []);

  return {
    externalIds,
    isProductLiked,
    refreshExternalIds,
    addExternalId,
    removeExternalId,
    isLoading,
  };
};


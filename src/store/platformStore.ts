import { create } from 'zustand';
import { CategoriesTreeResponse, CategoryTreeItem } from '../types';

interface PlatformState {
  selectedPlatform: string;
  selectedCategory: string;
  categoriesTree: CategoriesTreeResponse | null;
  setSelectedPlatform: (platform: string) => void;
  setSelectedCategory: (category: string) => void;
  setCategoriesTree: (tree: CategoriesTreeResponse | null) => void;
  getCompanyCategories: (locale?: 'en' | 'ko' | 'zh') => any[];
  getFilteredProducts: (type: 'newIn' | 'trending' | 'forYou') => any[];
  getRecommendedSubcategories: (locale?: 'en' | 'ko' | 'zh') => any[];
  // New methods for categories tree
  getCategoriesFromTree: (locale?: 'en' | 'ko' | 'zh') => any[];
  getSubcategoriesFromTree: (categoryId: string, locale?: 'en' | 'ko' | 'zh') => any[];
  getSubSubcategoriesFromTree: (categoryId: string, subcategoryId: string, locale?: 'en' | 'ko' | 'zh') => any[];
}

export const usePlatformStore = create<PlatformState>((set, get) => ({
  selectedPlatform: '1688',
  selectedCategory: '',
  categoriesTree: null,
  
  setSelectedPlatform: (platform: string) => {
    set({ selectedPlatform: platform, selectedCategory: '' });
  },
  
  setSelectedCategory: (category: string) => {
    set({ selectedCategory: category });
  },
  
  setCategoriesTree: (tree: CategoriesTreeResponse | null) => {
    set({ categoriesTree: tree });
  },
  
  getCompanyCategories: (locale: 'en' | 'ko' | 'zh' = 'en') => {
    const { categoriesTree } = get();
    
    // If we have categories tree data, use it
    if (categoriesTree && categoriesTree.tree) {
      return get().getCategoriesFromTree(locale);
    }
    
    // Mock data removed - API removed
    return [];
  },
  
  getFilteredProducts: (type: 'newIn' | 'trending' | 'forYou') => {
    // Mock products data removed - API removed
    return [];
  },
  
  getRecommendedSubcategories: (locale: 'en' | 'ko' | 'zh' = 'en') => {
    const { selectedCategory, categoriesTree } = get();
    
    // If we have categories tree data, use it
    if (categoriesTree && categoriesTree.tree && selectedCategory && selectedCategory !== 'all') {
      return get().getSubcategoriesFromTree(selectedCategory, locale);
    }
    
    // Mock data removed - API removed
    return [];
  },
  
  // Get top-level categories from tree
  getCategoriesFromTree: (locale: 'en' | 'ko' | 'zh' = 'en') => {
    const { categoriesTree } = get();
    if (!categoriesTree || !categoriesTree.tree) return [];
    
    return categoriesTree.tree.map((item: CategoryTreeItem) => ({
      id: item._id,
      name: item.name[locale] || item.name.en,
      externalId: item.externalId,
      level: item.level,
      isLeaf: item.isLeaf,
      children: item.children,
    }));
  },
  
  // Get subcategories (level 2) for a given category (level 1)
  getSubcategoriesFromTree: (categoryId: string, locale: 'en' | 'ko' | 'zh' = 'en') => {
    const { categoriesTree } = get();
    if (!categoriesTree || !categoriesTree.tree) return [];
    
    // Find the category in the tree
    const findCategory = (items: CategoryTreeItem[], id: string): CategoryTreeItem | null => {
      for (const item of items) {
        if (item._id === id) return item;
        if (item.children && item.children.length > 0) {
          const found = findCategory(item.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    const category = findCategory(categoriesTree.tree, categoryId);
    if (!category || !category.children) return [];
    
    return category.children.map((item: CategoryTreeItem) => ({
      id: item._id,
      name: item.name[locale] || item.name.en,
      externalId: item.externalId,
      level: item.level,
      isLeaf: item.isLeaf,
      children: item.children,
      subsubcategories: item.children || [],
    }));
  },
  
  // Get subsubcategories (level 3) for a given category and subcategory
  getSubSubcategoriesFromTree: (categoryId: string, subcategoryId: string, locale: 'en' | 'ko' | 'zh' = 'en') => {
    const { categoriesTree } = get();
    if (!categoriesTree || !categoriesTree.tree) return [];
    
    // Find the subcategory in the tree
    const findCategory = (items: CategoryTreeItem[], id: string): CategoryTreeItem | null => {
      for (const item of items) {
        if (item._id === id) return item;
        if (item.children && item.children.length > 0) {
          const found = findCategory(item.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    const subcategory = findCategory(categoriesTree.tree, subcategoryId);
    if (!subcategory || !subcategory.children) return [];
    
    return subcategory.children.map((item: CategoryTreeItem) => ({
      id: item._id,
      name: item.name[locale] || item.name.en,
      externalId: item.externalId,
      level: item.level,
      isLeaf: item.isLeaf,
    }));
  },
}));

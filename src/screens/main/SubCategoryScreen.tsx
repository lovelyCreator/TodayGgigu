import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants';
import { RootStackParamList } from '../../types';
import { usePlatformStore } from '../../store/platformStore';
import { useAppSelector } from '../../store/hooks';
import { useTranslation } from '../../hooks/useTranslation';
import { Image } from 'react-native';

const { width } = Dimensions.get('window');

type SubCategoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SubCategory'>;
type SubCategoryScreenRouteProp = RouteProp<RootStackParamList, 'SubCategory'>;

interface SubSubCategory {
  id: string;
  name: string;
  image?: string;
  subsubcategories?: any[];
}

const SubCategoryScreen: React.FC = () => {
  const navigation = useNavigation<SubCategoryScreenNavigationProp>();
  const route = useRoute<SubCategoryScreenRouteProp>();
  const { categoryName, categoryId: categoryIdParam, subcategories: passedSubcategories } = route.params;
  // Convert categoryId to string if it's a number, or use empty string if undefined
  const categoryId = categoryIdParam !== undefined && categoryIdParam !== null 
    ? categoryIdParam.toString() 
    : '';
  
  const [subSubCategories, setSubSubCategories] = useState<SubSubCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSubSubCategories, setFilteredSubSubCategories] = useState<SubSubCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isShowingSubcategories, setIsShowingSubcategories] = useState(false);
  
  // Ref to track if data has been loaded to prevent re-initialization
  const dataLoadedRef = useRef(false);
  const lastParamsKeyRef = useRef<string>('');
  
  // Get Zustand store
  const { getCompanyCategories, getSubcategoriesFromTree, selectedPlatform, categoriesTree } = usePlatformStore();
  
  // Get locale from Redux store
  const locale = useAppSelector((s) => s.i18n.locale) as 'en' | 'ko' | 'zh';
  const { t } = useTranslation();

  // Effect to load subcategories or subsubcategories
  useEffect(() => {
    // Reset ref if route params changed (new category selected)
    const currentKey = `${categoryId}-${selectedPlatform}-${locale}`;
    
    if (lastParamsKeyRef.current !== currentKey) {
      dataLoadedRef.current = false;
      lastParamsKeyRef.current = currentKey;
    }
    
    // Don't reload if data is already loaded (preserves state when navigating back)
    if (dataLoadedRef.current && subSubCategories.length > 0) {
      return;
    }
    
    setIsLoading(true);
    
    // console.log('SubCategoryScreen - categoryId:', categoryId, 'categoryIdParam:', categoryIdParam);
    // console.log('SubCategoryScreen - passedSubcategories:', passedSubcategories);
    
    // If subcategories are passed from navigation, use them directly
    if (passedSubcategories && passedSubcategories.length > 0) {
      // console.log('Using passed subcategories:', passedSubcategories.length);
      setIsShowingSubcategories(true);
      const formattedSubcategories: SubSubCategory[] = passedSubcategories.map((sub: any) => ({
        id: sub.id || sub._id || '',
        name: typeof sub.name === 'object' ? (sub.name[locale] || sub.name.en || sub.name) : (sub.name || ''),
        subsubcategories: sub.subsubcategories || sub.children || [],
      }));
      setSubSubCategories(formattedSubcategories);
      setFilteredSubSubCategories(formattedSubcategories);
      setIsLoading(false);
      dataLoadedRef.current = true;
      return;
    }
    
    // Otherwise, try to load from store/tree
    const companyCategories = getCompanyCategories(locale);
    
    // Normalize categoryId for comparison (handle both string and number)
    const normalizedCategoryId = categoryId?.toString();
    
    // Check if categoryId is a top-level category (showing subcategories)
    const topLevelCategory = companyCategories.find((cat: any) => {
      const catId = cat.id?.toString();
      return catId === normalizedCategoryId;
    });
    
    if (topLevelCategory) {
      // This is a top-level category, show all its subcategories
      setIsShowingSubcategories(true);
      
      // Try to get from categories tree first
      if (categoriesTree && categoriesTree.tree) {
        const subcategories = getSubcategoriesFromTree(normalizedCategoryId, locale);
        // console.log('Subcategories from tree:', subcategories);
        const formattedSubcategories: SubSubCategory[] = subcategories.map((sub: any) => ({
          id: sub.id || sub._id,
          name: sub.name || '',
        }));
        setSubSubCategories(formattedSubcategories);
        setFilteredSubSubCategories(formattedSubcategories);
        setIsLoading(false);
        dataLoadedRef.current = true;
      } else {
        // Fallback to mock data
        const subcategories = topLevelCategory.subcategories || [];
        // console.log('Subcategories from mock data:', subcategories);
        const formattedSubcategories: SubSubCategory[] = subcategories.map((sub: any) => ({
          id: sub.id,
          name: typeof sub.name === 'object' ? (sub.name[locale] || sub.name.en || sub.name) : sub.name,
        }));
        setSubSubCategories(formattedSubcategories);
        setFilteredSubSubCategories(formattedSubcategories);
        setIsLoading(false);
        dataLoadedRef.current = true;
      }
    } else {
      // This is a subcategory, show its subsubcategories
      setIsShowingSubcategories(false);
    let foundSubSubCategories: SubSubCategory[] = [];
    
    for (const category of companyCategories) {
      if (category.subcategories) {
          const subcategory = category.subcategories.find((sub: any) => {
            const subId = sub.id?.toString();
            return subId === normalizedCategoryId;
          });
        if (subcategory && subcategory.subsubcategories) {
            foundSubSubCategories = subcategory.subsubcategories.map((subSub: any) => ({
              id: subSub.id,
              name: typeof subSub.name === 'object' ? (subSub.name[locale] || subSub.name.en || subSub.name) : subSub.name,
            }));
          break;
        }
      }
    }
    
    setSubSubCategories(foundSubSubCategories);
    setFilteredSubSubCategories(foundSubSubCategories);
    }
    
    setIsLoading(false);
    dataLoadedRef.current = true;
  }, [categoryId, selectedPlatform, locale, categoriesTree, passedSubcategories]);

  // Effect to filter subsubcategories based on search query
  useEffect(() => {
    if (searchQuery) {
      const filtered = subSubCategories.filter(subSubCategory => 
        subSubCategory.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSubSubCategories(filtered);
    } else {
      setFilteredSubSubCategories(subSubCategories);
    }
  }, [searchQuery, subSubCategories]);

  const handleSubSubCategorySelect = (subSubCategory: SubSubCategory) => {
    if (isShowingSubcategories) {
      // Always navigate directly to ProductDiscovery, skip Sub2CategoryScreen
      // Pass subsubcategories if available for ProductDiscovery to use
      let localizedSubSubCategories: any[] = [];
      if (subSubCategory.subsubcategories && subSubCategory.subsubcategories.length > 0) {
        localizedSubSubCategories = subSubCategory.subsubcategories.map((subSubCat: any) => {
          // If subSubCat.name is an object with zh, en, ko, extract the correct locale
          if (subSubCat.name && typeof subSubCat.name === 'object') {
            return {
              ...subSubCat,
              name: subSubCat.name[locale] || subSubCat.name.en || subSubCat.name
            };
          }
          // If it's already a string, use it as is
          return subSubCat;
        });
      }
      
      // Navigate directly to ProductDiscovery
      navigation.navigate('ProductDiscovery', { 
        subCategoryName: subSubCategory.name,
        categoryId: categoryId,
        categoryName: categoryName,
        subcategoryId: subSubCategory.id,
        subsubcategories: localizedSubSubCategories,
      });
    } else {
      // If showing subsubcategories, navigate to ProductDiscovery with the selected subsubcategory
      // Find the parent category and subcategory IDs
      const companyCategories = getCompanyCategories(locale);
      const normalizedCategoryId = categoryId?.toString();
      let parentCategoryId: string | undefined = undefined;
      let parentCategoryName: string | undefined = categoryName;
      
      // Find the parent category that contains this subcategory
      for (const category of companyCategories) {
        if (category.subcategories) {
          const subcategory = category.subcategories.find((sub: any) => {
            const subId = sub.id?.toString();
            return subId === normalizedCategoryId;
          });
          if (subcategory) {
            parentCategoryId = category.id?.toString();
            parentCategoryName = typeof category.name === 'object' 
              ? (category.name[locale] || category.name.en || category.name)
              : category.name;
            break;
          }
        }
      }
      
    navigation.navigate('ProductDiscovery', { 
        subCategoryName: subSubCategory.name,
        categoryId: parentCategoryId || categoryId,
        categoryName: parentCategoryName || categoryName,
        subcategoryId: categoryId, // The current categoryId is actually the subcategory ID
        subsubcategories: [], // We're navigating to a specific subsubcategory, so pass empty array
        source: selectedPlatform, // Pass the current platform
    });
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="arrow-back" size={24} color={COLORS.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{categoryName}</Text>
      <View style={styles.placeholder} />
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <Icon name="search" size={24} color={COLORS.text.primary} style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder={t('search.placeholder')}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor={COLORS.gray[400]}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => setSearchQuery('')}>
          <Icon name="close" size={20} color={COLORS.gray[400]} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSubSubCategoryItem = (item: SubSubCategory, index: number) => {
    // Add safety check for item
    if (!item) {
      // console.warn('SubSubCategory item is null or undefined');
      return null;
    }
    
    // Generate a safe key
    const key = item.id || `subsubcategory-${index}`;
    
    // Check if this is the last item in a row (every 3rd item, or last item overall)
    const isLastInRow = (index + 1) % 3 === 0;
    const itemStyle = isLastInRow 
      ? [styles.quickCategoryItem, { marginRight: 0 }]
      : styles.quickCategoryItem;
    
    return (
      <TouchableOpacity
        key={key}
        style={itemStyle}
        onPress={() => handleSubSubCategorySelect(item)}
      >
        <View style={styles.quickCategoryImageContainer}>
          {item.image ? (
            <Image 
              source={{ uri: item.image }} 
              style={styles.quickCategoryImage}
              resizeMode="cover"
            />
          ) : (
            <Image 
              source={require('../../assets/icons/logo.png')} 
              style={styles.quickCategoryLogo}
              resizeMode="contain"
            />
          )}
        </View>
        <Text style={styles.quickCategoryName} numberOfLines={2}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    // Show loading indicator
    if (isLoading) {
      return (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{t('home.loading')}</Text>
        </View>
      );
    }

    // If subcategories are passed, we don't need categoryId
    if (!categoryId && (!passedSubcategories || passedSubcategories.length === 0)) {
      return (
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>{t('category.categoryIdNotProvided')}</Text>
        </View>
      );
    }

    // Ensure filteredSubSubCategories is an array before mapping
    if (!Array.isArray(filteredSubSubCategories)) {
      return (
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>{t('category.noItemsAvailable')}</Text>
        </View>
      );
    }
    
    // Filter out any null/undefined items before mapping
    const validSubSubCategories = filteredSubSubCategories.filter(item => {
      if (!item) return false;
      if (!item.name || typeof item.name !== 'string') {
        // console.warn('SubSubCategory item missing name:', item);
        return false;
      }
      return true;
    });
    
    if (validSubSubCategories.length === 0) {
      return (
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>{t('category.noItemsAvailableForCategory')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.quickCategoriesContainer}>
        <View style={styles.quickCategoriesGrid}>
          {validSubSubCategories.map((item, index) => renderSubSubCategoryItem(item, index))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderSearchBar()}
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS['2xl'],
    margin: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  categoriesContainer: {
    marginHorizontal: SPACING.md,
  },
  quickCategoriesContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.lg,
  },
  quickCategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
  },
  quickCategoryItem: {
    width: (width - SPACING.md * 2 - SPACING.sm * 2) / 3,
    alignItems: 'center',
    marginBottom: SPACING.md,
    marginRight: SPACING.sm,
  },
  quickCategoryImageContainer: {
    width: (width - SPACING.md * 2 - SPACING.sm * 2) / 3,
    height: (width - SPACING.md * 2 - SPACING.sm * 2) / 3,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  quickCategoryImage: {
    width: '100%',
    height: '100%',
  },
  quickCategoryLogo: {
    width: '80%',
    height: '55%',
  },
  quickCategoryName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.smmd,
    backgroundColor: COLORS.gray[50],
    marginBottom: SPACING.smmd,
    borderRadius: BORDER_RADIUS.md,
  },
  categoryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: FONTS.sizes.smmd,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
  },
  errorText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default SubCategoryScreen;
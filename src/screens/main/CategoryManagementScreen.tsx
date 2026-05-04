import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  Image,
} from 'react-native';
import Icon from '../../components/Icon';
import { useTopCategoriesMutation } from '../../hooks/useTopCategoriesMutation';
import { useChildCategoriesMutation } from '../../hooks/useChildCategoriesMutation';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants';
import { translations } from '../../i18n/translations';
import { useAppSelector } from '../../store/hooks';

interface Category {
  _id: string;
  externalId: string;
  name: {
    zh: string;
    en: string;
    ko: string;
  };
  level: number;
  path: string;
  isLeaf: boolean;
  isActive: boolean;
  isDefault: boolean;
  imageUrl?: string;
}

interface CategoryLevel2 extends Category {
  children?: Category[];
}

const CategoryManagementScreen: React.FC = () => {
  const locale = useAppSelector((state) => state.i18n.locale) as 'en' | 'ko' | 'zh';
  
  // Top categories hook
  const topCategoriesMutation = useTopCategoriesMutation({
    onSuccess: (data) => {
      console.log('Top categories loaded:', data);
      setTopCategories(data.categories || []);
    },
    onError: (error) => {
      console.error('Failed to load top categories:', error);
      setTopCategoriesError(error);
    },
  });

  // Child categories hook
  const childCategoriesMutation = useChildCategoriesMutation({
    onSuccess: (data) => {
      console.log('Child categories loaded:', data);
      setChildCategories(data.tree || []);
    },
    onError: (error) => {
      console.error('Failed to load child categories:', error);
      setChildCategoriesError(error);
    },
  });

  const [topCategories, setTopCategories] = useState<Category[]>([]);
  const [childCategories, setChildCategories] = useState<CategoryLevel2[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [topCategoriesError, setTopCategoriesError] = useState<string | null>(null);
  const [childCategoriesError, setChildCategoriesError] = useState<string | null>(null);

  // Load top categories on mount
  useEffect(() => {
    loadTopCategories();
  }, []);

  const loadTopCategories = () => {
    topCategoriesMutation.mutate('1688');
  };

  const handleSelectTopCategory = (category: Category) => {
    setSelectedCategory(category);
    setChildCategories([]); // Reset child categories
    // Load child categories for selected category
    childCategoriesMutation.mutate('1688', category._id);
  };

  const getLocalizedName = (name: any) => {
    if (typeof name === 'string') return name;
    return name?.[locale] || name?.en || 'N/A';
  };

  // Render top category item
  const renderTopCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.topCategoryCard,
        selectedCategory?._id === item._id && styles.topCategoryCardSelected,
      ]}
      onPress={() => handleSelectTopCategory(item)}
      activeOpacity={0.7}
    >
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.categoryImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.placeholderImage}>
          <Icon name="grid" size={32} color={COLORS.gray[400]} />
        </View>
      )}
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName} numberOfLines={2}>
          {getLocalizedName(item.name)}
        </Text>
        <Text style={styles.categoryExternalId}>{item.externalId}</Text>
      </View>
      {selectedCategory?._id === item._id && (
        <Icon name="checkmark-circle" size={24} color={COLORS.primary} />
      )}
    </TouchableOpacity>
  );

  // Render child category item
  const renderChildCategoryItem = ({ item }: { item: CategoryLevel2 }) => (
    <View style={styles.childCategoryContainer}>
      <TouchableOpacity style={styles.childCategoryItem} activeOpacity={0.7}>
        <View style={styles.categoryHeader}>
          <Text style={styles.childCategoryName}>
            {getLocalizedName(item.name)}
          </Text>
          <Text style={styles.categoryLevel}>Level {item.level}</Text>
        </View>
        <Text style={styles.childCategoryPath}>{item.path}</Text>
        {!item.isLeaf && item.children && item.children.length > 0 && (
          <View style={styles.subCategoriesContainer}>
            <Text style={styles.subCategoriesLabel}>
              Sub-categories ({item.children.length}):
            </Text>
            {item.children.slice(0, 5).map((child) => (
              <Text key={child._id} style={styles.subCategoryItem}>
                • {getLocalizedName(child.name)}
              </Text>
            ))}
            {item.children.length > 5 && (
              <Text style={styles.subCategoryItem}>
                + {item.children.length - 5} more...
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Category Management</Text>
        <TouchableOpacity
          onPress={loadTopCategories}
          disabled={topCategoriesMutation.isLoading}
        >
          <Icon
            name={topCategoriesMutation.isLoading ? 'sync' : 'refresh'}
            size={24}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Error Messages */}
      {topCategoriesError && (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={18} color={COLORS.error} />
          <Text style={styles.errorText}>{topCategoriesError}</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Top Categories Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Categories</Text>
          {topCategoriesMutation.isLoading ? (
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
              style={styles.loader}
            />
          ) : (
            <FlatList
              data={topCategories}
              renderItem={renderTopCategoryItem}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              numColumns={2}
              columnWrapperStyle={styles.columnWrapper}
            />
          )}
        </View>

        {/* Child Categories Section */}
        {selectedCategory && (
          <View style={styles.section}>
            <View style={styles.childCategoryHeader}>
              <Text style={styles.sectionTitle}>
                {getLocalizedName(selectedCategory.name)} - Sub-categories
              </Text>
              {childCategoriesMutation.isLoading && (
                <ActivityIndicator
                  size="small"
                  color={COLORS.primary}
                />
              )}
            </View>

            {childCategoriesError && (
              <View style={styles.errorContainer}>
                <Icon name="alert-circle" size={18} color={COLORS.error} />
                <Text style={styles.errorText}>{childCategoriesError}</Text>
              </View>
            )}

            {childCategories.length > 0 ? (
              <FlatList
                data={childCategories}
                renderItem={renderChildCategoryItem}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
              />
            ) : (
              <Text style={styles.emptyText}>No sub-categories available</Text>
            )}
          </View>
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  topCategoryCard: {
    flex: 0.48,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.gray[50],
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  topCategoryCardSelected: {
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  categoryImage: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.sm,
  },
  placeholderImage: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  categoryInfo: {
    flex: 1,
    marginRight: SPACING.xs,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  categoryExternalId: {
    fontSize: 10,
    color: COLORS.gray[500],
  },
  childCategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  childCategoryContainer: {
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.gray[50],
    ...SHADOWS.sm,
  },
  childCategoryItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  childCategoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
  },
  categoryLevel: {
    fontSize: 12,
    color: COLORS.gray[500],
    backgroundColor: COLORS.gray[200],
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  childCategoryPath: {
    fontSize: 11,
    color: COLORS.gray[500],
    marginBottom: SPACING.sm,
  },
  subCategoriesContainer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  subCategoriesLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  subCategoryItem: {
    fontSize: 11,
    color: COLORS.gray[600],
    marginVertical: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '10',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  errorText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 12,
    color: COLORS.error,
  },
  loader: {
    marginVertical: SPACING.xl,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.gray[500],
    fontSize: 14,
    marginVertical: SPACING.lg,
  },
});

export default CategoryManagementScreen;

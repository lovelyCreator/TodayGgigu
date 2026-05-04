import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import Icon from './Icon';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants';

interface AddressResult {
  id: string;
  address: string;
  postalCode: string;
  roadAddress: string;
  jibunAddress: string;
}

interface AddressSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAddress: (address: AddressResult) => void;
}

const AddressSearchModal: React.FC<AddressSearchModalProps> = ({
  visible,
  onClose,
  onSelectAddress,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AddressResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Mock Korean address data for demonstration
  const mockAddresses: AddressResult[] = [
    {
      id: '1',
      address: '서울특별시 강남구 테헤란로 152',
      postalCode: '06236',
      roadAddress: '서울특별시 강남구 테헤란로 152',
      jibunAddress: '서울특별시 강남구 역삼동 737',
    },
    {
      id: '2',
      address: '서울특별시 강남구 강남대로 396',
      postalCode: '06241',
      roadAddress: '서울특별시 강남구 강남대로 396',
      jibunAddress: '서울특별시 강남구 역삼동 825-22',
    },
    {
      id: '3',
      address: '서울특별시 송파구 올림픽로 300',
      postalCode: '05551',
      roadAddress: '서울특별시 송파구 올림픽로 300',
      jibunAddress: '서울특별시 송파구 신천동 7',
    },
    {
      id: '4',
      address: '서울특별시 중구 세종대로 110',
      postalCode: '04524',
      roadAddress: '서울특별시 중구 세종대로 110',
      jibunAddress: '서울특별시 중구 태평로1가 31',
    },
    {
      id: '5',
      address: '서울특별시 마포구 월드컵북로 396',
      postalCode: '03925',
      roadAddress: '서울특별시 마포구 월드컵북로 396',
      jibunAddress: '서울특별시 마포구 상암동 1601',
    },
    {
      id: '6',
      address: '서울특별시 강남구 역삼동',
      postalCode: '06234',
      roadAddress: '서울특별시 강남구 테헤란로 123',
      jibunAddress: '서울특별시 강남구 역삼동 678-9',
    },
    {
      id: '7',
      address: '서울특별시 강남구 삼성동',
      postalCode: '06180',
      roadAddress: '서울특별시 강남구 영동대로 513',
      jibunAddress: '서울특별시 강남구 삼성동 159',
    },
    {
      id: '8',
      address: '부산광역시 해운대구 해운대로 570',
      postalCode: '48094',
      roadAddress: '부산광역시 해운대구 해운대로 570',
      jibunAddress: '부산광역시 해운대구 우동 1495',
    },
    {
      id: '9',
      address: '대구광역시 중구 동성로 2가',
      postalCode: '41911',
      roadAddress: '대구광역시 중구 동성로2가 85',
      jibunAddress: '대구광역시 중구 동성로2가 85',
    },
    {
      id: '10',
      address: '인천광역시 연수구 송도동',
      postalCode: '21984',
      roadAddress: '인천광역시 연수구 센트럴로 263',
      jibunAddress: '인천광역시 연수구 송도동 24-4',
    },
  ];

  // Intelligent search with fuzzy matching and Korean support
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    // Simulate API call delay
    setTimeout(() => {
      const query = searchQuery.toLowerCase().trim();
      
      // Intelligent filtering with multiple criteria
      const filtered = mockAddresses.filter((addr) => {
        const roadAddr = addr.roadAddress.toLowerCase();
        const jibunAddr = addr.jibunAddress.toLowerCase();
        const postalCode = addr.postalCode;
        
        // Check if query matches:
        // 1. Postal code (exact or partial)
        if (postalCode.includes(query)) return true;
        
        // 2. Any part of road address
        if (roadAddr.includes(query)) return true;
        
        // 3. Any part of jibun address
        if (jibunAddr.includes(query)) return true;
        
        // 4. Split query into words and check if all words match
        const queryWords = query.split(' ').filter(w => w.length > 0);
        const allWordsMatch = queryWords.every(word => 
          roadAddr.includes(word) || jibunAddr.includes(word)
        );
        if (allWordsMatch) return true;
        
        return false;
      });
      
      // Sort results by relevance
      const sorted = filtered.sort((a, b) => {
        const aRoad = a.roadAddress.toLowerCase();
        const bRoad = b.roadAddress.toLowerCase();
        
        // Prioritize exact matches at the start
        const aStartsWith = aRoad.startsWith(query);
        const bStartsWith = bRoad.startsWith(query);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        
        // Then prioritize by position of match
        const aIndex = aRoad.indexOf(query);
        const bIndex = bRoad.indexOf(query);
        
        return aIndex - bIndex;
      });
      
      setSearchResults(sorted);
      setIsSearching(false);
    }, 500);
  };

  // Optional: Real API integration example (commented out)
  /*
  const handleSearchWithAPI = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // Example using Juso.go.kr API
      const API_KEY = 'YOUR_API_KEY_HERE'; // Get from https://www.juso.go.kr/
      const response = await fetch(
        `https://www.juso.go.kr/addrlink/addrLinkApi.do?confmKey=${API_KEY}&currentPage=1&countPerPage=10&keyword=${encodeURIComponent(searchQuery)}&resultType=json`
      );
      
      const data = await response.json();
      
      if (data.results?.common?.errorCode === '0') {
        const results = data.results.juso.map((item: any, index: number) => ({
          id: index.toString(),
          address: item.roadAddr,
          postalCode: item.zipNo,
          roadAddress: item.roadAddr,
          jibunAddress: item.jibunAddr,
        }));
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  */

  const handleSelectAddress = (address: AddressResult) => {
    onSelectAddress(address);
    setSearchQuery('');
    setSearchResults([]);
    onClose();
  };

  const renderAddressItem = ({ item }: { item: AddressResult }) => (
    <TouchableOpacity
      style={styles.addressItem}
      onPress={() => handleSelectAddress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.addressItemContent}>
        <View style={styles.addressItemHeader}>
          <Icon name="location" size={18} color={COLORS.red} />
          <Text style={styles.postalCode}>[{item.postalCode}]</Text>
        </View>
        <Text style={styles.roadAddress}>{item.roadAddress}</Text>
        <Text style={styles.jibunAddress}>(지번) {item.jibunAddress}</Text>
      </View>
      <Icon name="chevron-forward" size={20} color={COLORS.gray[400]} />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Search Address</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Icon
                name="search"
                size={20}
                color={COLORS.gray[400]}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Enter address keyword (e.g., 강남구, 테헤란로)"
                placeholderTextColor={COLORS.gray[400]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  style={styles.clearButton}
                >
                  <Icon name="close-circle" size={20} color={COLORS.gray[400]} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearch}
              activeOpacity={0.7}
            >
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>

          {/* Search Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>
              Enter a keyword such as road name, building name, or district name
            </Text>
          </View>

          {/* Results */}
          <View style={styles.resultsContainer}>
            {isSearching ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.red} />
                <Text style={styles.loadingText}>Searching addresses...</Text>
              </View>
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                renderItem={renderAddressItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.resultsList}
              />
            ) : searchQuery.trim() !== '' ? (
              <View style={styles.emptyContainer}>
                <Icon name="search" size={48} color={COLORS.gray[300]} />
                <Text style={styles.emptyText}>No addresses found</Text>
                <Text style={styles.emptySubtext}>
                  Try searching with different keywords
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Icon name="location-outline" size={48} color={COLORS.gray[300]} />
                <Text style={styles.emptyText}>Search for an address</Text>
                <Text style={styles.emptySubtext}>
                  Enter keywords to find your address
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    height: '90%',
    paddingTop: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  headerTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    paddingHorizontal: SPACING.md,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    paddingVertical: 12,
  },
  clearButton: {
    padding: SPACING.xs,
  },
  searchButton: {
    backgroundColor: COLORS.red,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
  instructionsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  instructionsText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
    lineHeight: 18,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  resultsList: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
  },
  addressItemContent: {
    flex: 1,
  },
  addressItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  postalCode: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    color: COLORS.red,
    marginLeft: SPACING.xs,
  },
  roadAddress: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  jibunAddress: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    marginTop: SPACING.xs,
  },
});

export default AddressSearchModal;

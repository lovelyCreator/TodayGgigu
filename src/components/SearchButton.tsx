import React, { useCallback, useEffect, useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ViewStyle,
  Alert,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from './Icon';
import { BORDER_RADIUS, COLORS, FONTS, SPACING } from '../constants';
import CameraIcon from '../assets/icons/CameraIcon';
import { useAppSelector } from '../store/hooks';
import { translations } from '../i18n/translations';
import { requestCameraAndPhotoLibraryPermissions } from '../utils/permissions';
import MenuIcon from '../assets/icons/MenuIcon';

/** If full copy needs font size ≤10 to fit one line, show this many characters + "..." */
const PLACEHOLDER_TRUNC_CHARS = 12;

const measureTextBase = {
  fontWeight: '400' as const,
  color: COLORS.text.primary,
  fontFamily: FONTS.families.default,
  ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
};

type ResolvedPlaceholder = { text: string; fontSize: 10 | 11 };

/**
 * Off-screen width-bound measure: try font 11, then 10; if still wraps, use 12 chars + "..." at 11.
 */
const PlaceholderMeasurePass: React.FC<{
  slotWidth: number;
  fullText: string;
  fontSize: 10 | 11;
  onResult: (singleLine: boolean) => void;
}> = ({ slotWidth, fullText, fontSize, onResult }) => (
  <Text
    style={[
      measureTextBase,
      {
        position: 'absolute',
        left: 0,
        top: 0,
        width: slotWidth,
        opacity: 0,
        fontSize,
        zIndex: -1,
      },
    ]}
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    onTextLayout={(e) => {
      onResult(e.nativeEvent.lines.length <= 1);
    }}
  >
    {fullText}
  </Text>
);

const HomeFigmaPlaceholder: React.FC<{ fullText: string }> = ({ fullText }) => {
  const [slotWidth, setSlotWidth] = useState(0);
  const [measurePass, setMeasurePass] = useState<10 | 11 | null>(null);
  const [resolved, setResolved] = useState<ResolvedPlaceholder>({ text: fullText, fontSize: 11 });

  useEffect(() => {
    setResolved({ text: fullText, fontSize: 11 });
    setMeasurePass(null);
  }, [fullText]);

  useEffect(() => {
    if (slotWidth > 0) {
      setMeasurePass(11);
    } else {
      setMeasurePass(null);
    }
  }, [slotWidth, fullText]);

  const onSlotLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setSlotWidth((prev) => (Math.abs(prev - w) < 0.5 ? prev : w));
  }, []);

  const onLineCheck11 = useCallback(
    (singleLine: boolean) => {
      if (singleLine) {
        setResolved({ text: fullText, fontSize: 11 });
        setMeasurePass(null);
      } else {
        setMeasurePass(10);
      }
    },
    [fullText],
  );

  const onLineCheck10 = useCallback(
    (singleLine: boolean) => {
      if (singleLine) {
        setResolved({ text: fullText, fontSize: 10 });
      } else {
        const prefix = [...fullText].slice(0, PLACEHOLDER_TRUNC_CHARS).join('');
        setResolved({ text: `${prefix}...`, fontSize: 11 });
      }
      setMeasurePass(null);
    },
    [fullText],
  );

  return (
    <View style={styles.figmaPlaceholderSlot} onLayout={onSlotLayout}>
      {slotWidth > 0 && measurePass === 11 && (
        <PlaceholderMeasurePass
          key={`m11-${fullText}-${slotWidth}`}
          slotWidth={slotWidth}
          fullText={fullText}
          fontSize={11}
          onResult={onLineCheck11}
        />
      )}
      {slotWidth > 0 && measurePass === 10 && (
        <PlaceholderMeasurePass
          key={`m10-${fullText}-${slotWidth}`}
          slotWidth={slotWidth}
          fullText={fullText}
          fontSize={10}
          onResult={onLineCheck10}
        />
      )}
      <Text
        numberOfLines={1}
        style={[
          styles.figmaPlaceholderVisible,
          {
            fontSize: resolved.fontSize,
            lineHeight: resolved.fontSize + (Platform.OS === 'android' ? 6 : 4),
          },
          measureTextBase,
        ]}
      >
        {resolved.text}
      </Text>
    </View>
  );
};

interface SearchButtonProps {
  placeholder: string;
  onPress: () => void;
  onCameraPress?: () => void;
  style?: ViewStyle;
  isHomepage: boolean;
  /** When true, homepage menu (category) is hidden — use a separate header menu instead */
  hideMenu?: boolean;
  /** Strong black border like marketing home designs */
  prominentBorder?: boolean;
  /** Show `placeholder` as the main search row copy (instead of trending + keyword) */
  showPlaceholderAsBody?: boolean;
  /** Camera control on the left (marketing home layout) */
  cameraLeading?: boolean;
}

const SearchButton: React.FC<SearchButtonProps> = ({
  placeholder,
  onPress,
  onCameraPress,
  style,
  isHomepage,
  hideMenu = false,
  prominentBorder = false,
  showPlaceholderAsBody = false,
  cameraLeading = false,
}) => {
  const navigation = useNavigation();
  const locale = useAppSelector((s) => s.i18n.locale) as 'en' | 'ko' | 'zh';

  // Translation function
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  const handleCameraPress = async () => {
    if (!onCameraPress) return;

    // Request camera and photo library permissions
    try {
      const { camera, photoLibrary } = await requestCameraAndPhotoLibraryPermissions();

      if (!camera || !photoLibrary) {
        Alert.alert('Permission Required', 'Please grant camera and photo library permissions to use image search.');
        return;
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Permission Error', 'Failed to request permissions. Please try again.');
      return;
    }

    // Permissions granted, call the original handler
    onCameraPress();
  };

  const handleCategoryPress = async () => {
    navigation.navigate('Category' as never);
  };

  const figmaSearchBar =
    isHomepage && prominentBorder && hideMenu && cameraLeading && showPlaceholderAsBody;

  const containerBorderStyle = figmaSearchBar
    ? {
        borderWidth: 1,
        borderColor: COLORS.black,
        borderRadius: 22,
        minHeight: 48,
        paddingRight: SPACING.xs,
      }
    : prominentBorder && isHomepage
      ? {
          borderWidth: 2,
          borderColor: 'rgba(0,0,0,0.2)',
          ...(hideMenu
            ? { borderTopLeftRadius: BORDER_RADIUS.md, borderBottomLeftRadius: BORDER_RADIUS.md }
            : {}),
        }
      : !isHomepage
        ? { borderRadius: BORDER_RADIUS.full, borderWidth: 2.5 }
        : hideMenu && isHomepage
          ? { borderWidth: 0, borderTopLeftRadius: BORDER_RADIUS.md, borderBottomLeftRadius: BORDER_RADIUS.md }
          : { borderWidth: 0 };

  return (
    <>
      <View style={[styles.container, style, containerBorderStyle]}>
        {isHomepage && !hideMenu && (
          <TouchableOpacity style={styles.menuButton} onPress={handleCategoryPress}>
            <MenuIcon width={24} height={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        )}
        {cameraLeading && onCameraPress && (
          <TouchableOpacity style={styles.cameraButtonLeading} onPress={handleCameraPress}>
            <CameraIcon width={24} height={24} color={COLORS.black} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.input, figmaSearchBar && styles.inputFigma]} onPress={onPress}>
          {isHomepage && showPlaceholderAsBody && placeholder ? (
            figmaSearchBar ? (
              <HomeFigmaPlaceholder fullText={String(placeholder)} />
            ) : (
              <Text style={styles.placeholderBody} numberOfLines={2}>
                {placeholder}
              </Text>
            )
          ) : (
            <>
              <Text style={styles.trendingText}>{t('search.trending')}</Text>
              <Text style={styles.keywordText}>{t('search.keyword')}</Text>
            </>
          )}
        </TouchableOpacity>
        {!cameraLeading && onCameraPress && (
          <TouchableOpacity style={styles.cameraButton} onPress={handleCameraPress}>
            <CameraIcon width={24} height={24} color={COLORS.text.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.searchButton,
            !isHomepage && { borderRadius: BORDER_RADIUS.full },
            figmaSearchBar && styles.searchButtonFigma,
          ]}
          onPress={onPress}
        >
          <Icon name="search" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    minHeight: 40,
  },
  input: {
    flex: 1,
    flexDirection: 'row',
    marginHorizontal: SPACING.sm,
  },
  inputFigma: {
    marginHorizontal: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  figmaPlaceholderSlot: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    position: 'relative',
  },
  figmaPlaceholderVisible: {
    color: COLORS.gray[500],
  },
  cameraButtonLeading: {
    paddingLeft: SPACING.md,
    paddingRight: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.red,
    fontWeight: '600',
  },
  keywordText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  placeholderBody: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '600',
    lineHeight: Math.round(FONTS.sizes.sm * 20 / 14),
  },
  cameraButton: {
    paddingRight: SPACING.smmd,
    flexDirection: 'row',
  },
  menuButton: {
    padding: SPACING.sm,
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderColor: '#0000000D',
    borderTopLeftRadius: BORDER_RADIUS.md,
    borderBottomLeftRadius: BORDER_RADIUS.md,
  },
  searchButton: {
    backgroundColor: COLORS.text.primary,
    borderRadius: BORDER_RADIUS.md,
    width: 40,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.xs,
  },
  searchButtonFigma: {
    width: 40,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.black,
    marginRight: SPACING.sm,
    marginVertical: 6,
  },
  bar: {
    width: 0.5,
    height: 16,
    backgroundColor: COLORS.gray[600],
    marginHorizontal: SPACING.sm,
  },
});

export default SearchButton;

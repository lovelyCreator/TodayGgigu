import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';
import {
  getContentMaxWidth,
  getPagePaddingHorizontal,
} from '../utils/responsiveLayout';

type TabletContentProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** 태블릿에서도 전체 너비를 쓸 때 (배너·풀블리드 섹션). */
  fullWidth?: boolean;
};

/**
 * 태블릿에서 본문을 중앙 정렬하고 최대 너비를 제한한다.
 * 폰에서는 children 을 그대로 전체 너비로 렌더한다.
 */
export const TabletContent: React.FC<TabletContentProps> = ({
  children,
  style,
  contentStyle,
  fullWidth = false,
}) => {
  const responsive = useResponsive();
  const useConstrained = responsive.isTablet && !fullWidth;
  const paddingH = useConstrained ? getPagePaddingHorizontal(responsive) : 0;
  const maxWidth = useConstrained ? getContentMaxWidth(responsive) : undefined;

  return (
    <View style={[styles.outer, style]}>
      <View
        style={[
          styles.inner,
          paddingH > 0 && { paddingHorizontal: paddingH },
          maxWidth != null && {
            maxWidth,
            width: '100%',
            alignSelf: 'center',
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    width: '100%',
  },
  inner: {
    flex: 1,
    width: '100%',
  },
});

export default TabletContent;

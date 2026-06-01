import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { COLORS, SPACING } from '../../constants';
import SkeletonBlock from './SkeletonBlock';

export type SkeletonVariant =
  /** Vertical list of card rows: thumb + 2 text lines. */
  | 'list'
  /** 2-column product card grid. */
  | 'grid'
  /** Big hero image + title + meta + body lines. */
  | 'detail'
  /** Header-only screen used for forms / setting / chat. */
  | 'form'
  /** Plain centered placeholder (splash / auth). */
  | 'plain';

interface ScreenSkeletonProps {
  variant?: SkeletonVariant;
  /** Show the top app header bar. Most screens want this; turn off for splash. */
  showHeader?: boolean;
}

const HeaderBar: React.FC = () => (
  <View style={styles.header}>
    <SkeletonBlock width={28} height={28} borderRadius={14} />
    <SkeletonBlock width={120} height={18} style={{ marginLeft: SPACING.md }} />
    <View style={{ flex: 1 }} />
    <SkeletonBlock width={28} height={28} borderRadius={14} />
  </View>
);

const ListRow: React.FC = () => (
  <View style={styles.listRow}>
    <SkeletonBlock width={64} height={64} borderRadius={8} />
    <View style={styles.listRowText}>
      <SkeletonBlock width="85%" height={14} />
      <SkeletonBlock width="55%" height={12} style={{ marginTop: SPACING.sm }} />
      <SkeletonBlock width="35%" height={12} style={{ marginTop: SPACING.xs }} />
    </View>
  </View>
);

const GridCard: React.FC = () => (
  <View style={styles.gridCard}>
    <SkeletonBlock width="100%" height={140} borderRadius={8} />
    <SkeletonBlock width="90%" height={12} style={{ marginTop: SPACING.sm }} />
    <SkeletonBlock width="60%" height={12} style={{ marginTop: SPACING.xs }} />
    <SkeletonBlock width="40%" height={14} style={{ marginTop: SPACING.xs }} />
  </View>
);

const FormBlock: React.FC = () => (
  <View style={{ marginBottom: SPACING.lg }}>
    <SkeletonBlock width="40%" height={12} />
    <SkeletonBlock
      width="100%"
      height={44}
      borderRadius={8}
      style={{ marginTop: SPACING.sm }}
    />
  </View>
);

/**
 * Layout-aware skeleton used as Suspense fallback for lazy-loaded screens.
 * Renders a header bar + a body shape matching the upcoming screen so the
 * transition feels like data filling in rather than a swap.
 */
const ScreenSkeleton: React.FC<ScreenSkeletonProps> = ({
  variant = 'list',
  showHeader = true,
}) => {
  const renderBody = () => {
    switch (variant) {
      case 'list':
        return (
          <View style={styles.bodyPadded}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <ListRow key={i} />
            ))}
          </View>
        );

      case 'grid':
        return (
          <View style={styles.gridWrap}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <GridCard key={i} />
            ))}
          </View>
        );

      case 'detail':
        return (
          <ScrollView contentContainerStyle={styles.bodyPadded} scrollEnabled={false}>
            <SkeletonBlock width="100%" height={280} borderRadius={12} />
            <SkeletonBlock
              width="70%"
              height={20}
              style={{ marginTop: SPACING.lg }}
            />
            <SkeletonBlock
              width="40%"
              height={18}
              style={{ marginTop: SPACING.sm }}
            />
            <View style={styles.detailDivider} />
            <SkeletonBlock width="100%" height={12} />
            <SkeletonBlock
              width="95%"
              height={12}
              style={{ marginTop: SPACING.sm }}
            />
            <SkeletonBlock
              width="80%"
              height={12}
              style={{ marginTop: SPACING.sm }}
            />
            <SkeletonBlock
              width="60%"
              height={12}
              style={{ marginTop: SPACING.sm }}
            />
          </ScrollView>
        );

      case 'form':
        return (
          <View style={styles.bodyPadded}>
            <FormBlock />
            <FormBlock />
            <FormBlock />
            <FormBlock />
            <SkeletonBlock
              width="100%"
              height={48}
              borderRadius={8}
              style={{ marginTop: SPACING.lg }}
            />
          </View>
        );

      case 'plain':
      default:
        return (
          <View style={styles.plainBody}>
            <SkeletonBlock width={120} height={120} borderRadius={60} />
            <SkeletonBlock
              width={180}
              height={16}
              style={{ marginTop: SPACING.lg }}
            />
            <SkeletonBlock
              width={120}
              height={12}
              style={{ marginTop: SPACING.sm }}
            />
          </View>
        );
    }
  };

  return (
    <View style={styles.root}>
      {showHeader && <HeaderBar />}
      {renderBody()}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING['2xl'],
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  bodyPadded: {
    padding: SPACING.md,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  listRowText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  gridCard: {
    width: '48%',
    marginBottom: SPACING.md,
  },
  detailDivider: {
    height: 1,
    backgroundColor: COLORS.gray[100],
    marginVertical: SPACING.lg,
  },
  plainBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ScreenSkeleton;

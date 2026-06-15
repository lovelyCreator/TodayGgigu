import { StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING } from '../../../../constants';

/** 설정 화면 — 상품관리 / 시장조사 / 계정센터 공통 리스트 스타일 */
export const profileSettingsMenuStyles = StyleSheet.create({
  menuContainer: {
    marginBottom: SPACING.xl,
  },
  sectionCard: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.smmd,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 0,
    backgroundColor: COLORS.white,
  },
  sectionHeaderText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    backgroundColor: COLORS.white,
  },
  firstMenuItem: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
});

import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../../../types';

export type ProfileSettingsNav = StackNavigationProp<RootStackParamList, 'ProfileSettings'>;

export type ProfileSettingsTranslate = (key: string, params?: { [key: string]: string }) => string;

export type ProfileSettingsSectionBaseProps = {
  t: ProfileSettingsTranslate;
  navigation: ProfileSettingsNav;
  showComingSoon: (feature: string) => void;
};

/** 개별 메뉴 행 컴포넌트용 (각 등록부 폴더 내 파일) */
export type ProfileSettingsMenuRowComponentProps = ProfileSettingsSectionBaseProps & {
  isFirst?: boolean;
  isLast?: boolean;
};

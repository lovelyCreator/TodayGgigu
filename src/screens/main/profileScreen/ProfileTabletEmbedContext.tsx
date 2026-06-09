import React, { createContext, useContext, useMemo } from 'react';
import type { ProfileSidebarActiveKey } from './ProfileTabletSidebar';
import type { ProfileDashboardRoute } from './profileTabletDashboardRoute';
import { mapNavigationTargetToDashboardRoute } from './profileTabletDashboardRoute';

export type ProfileTabletEmbedContextValue = {
  isEmbedActive: boolean;
  pushRoute: (route: ProfileDashboardRoute) => void;
  popRoute: () => void;
  replaceRoute: (route: ProfileDashboardRoute) => void;
  openSidebarPanel: (key: ProfileSidebarActiveKey, initialTab?: string) => void;
  navigateEmbedded: (target: string, params?: Record<string, unknown>) => boolean;
};

const ProfileTabletEmbedContext =
  createContext<ProfileTabletEmbedContextValue | null>(null);

export const ProfileTabletEmbedProvider: React.FC<{
  value: ProfileTabletEmbedContextValue;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <ProfileTabletEmbedContext.Provider value={value}>
    {children}
  </ProfileTabletEmbedContext.Provider>
);

export const useProfileTabletEmbed = (): ProfileTabletEmbedContextValue | null =>
  useContext(ProfileTabletEmbedContext);

export const useProfileTabletEmbedNavigation = (embedded = false) => {
  const embed = useProfileTabletEmbed();

  return useMemo(() => {
    const tryEmbedNavigate = (
      target: string,
      params?: Record<string, unknown>,
    ): boolean => {
      if (!embedded || !embed?.isEmbedActive) return false;
      return embed.navigateEmbedded(target, params);
    };

    const handleEmbeddedBack = (fallback?: () => void) => {
      if (embedded && embed?.isEmbedActive) {
        embed.popRoute();
        return;
      }
      fallback?.();
    };

    return { embed, tryEmbedNavigate, handleEmbeddedBack };
  }, [embed, embedded]);
};

export const buildEmbedNavigateHelper = (
  embed: ProfileTabletEmbedContextValue | null,
  embedded: boolean,
  fallbackNavigate: (target: string, params?: Record<string, unknown>) => void,
) => {
  return (target: string, params?: Record<string, unknown>) => {
    if (embedded && embed?.isEmbedActive) {
      const route = mapNavigationTargetToDashboardRoute(target, params);
      if (route) {
        embed.pushRoute(route);
        return;
      }
    }
    fallbackNavigate(target, params);
  };
};

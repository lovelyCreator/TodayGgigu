import React, { useEffect } from 'react';
import { NavigationContainerRef, ParamListBase } from '@react-navigation/native';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { useAppSelector } from '../store/hooks';
import { translations } from '../i18n/translations';

function getActiveRoute(state: any): { name?: string; params?: Record<string, unknown> } | undefined {
  if (!state) return undefined;
  const route = state.routes[state.index];
  if (route.state) return getActiveRoute(route.state);
  return route;
}

interface InquiryNotificationListenerProps {
  navigationRef: React.RefObject<NavigationContainerRef<ParamListBase> | null>;
}

const InquiryNotificationListener: React.FC<InquiryNotificationListenerProps> = ({ navigationRef }) => {
  const { onMessageReceived, onGeneralInquiryMessageReceived } = useSocket();
  const { showToast } = useToast();
  const locale = useAppSelector((s) => s.i18n.locale) as 'en' | 'ko' | 'zh';

  const t = (key: string) => {
    const keys = key.split('.');
    let value: unknown = translations[locale as keyof typeof translations];
    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
    }
    return typeof value === 'string' ? value : undefined;
  };

  const shouldNotify = (chatRoute: string, inquiryId: string) => {
    const state = navigationRef.current?.getRootState();
    const route = getActiveRoute(state);
    if (route?.name === chatRoute) {
      const params = route.params as { inquiryId?: string } | undefined;
      if (params?.inquiryId === inquiryId) return false;
    }
    return true;
  };

  useEffect(() => {
    onMessageReceived((data) => {
      if (data.message?.senderType !== 'admin') return;
      if (!shouldNotify('Chat', data.inquiryId)) return;

      const preview = data.message.message?.trim();
      const fallback = t('message.newOrderInquiryMessage') || 'New order inquiry message';
      showToast(preview ? preview.slice(0, 80) : fallback, 'info', 4000);
    });

    onGeneralInquiryMessageReceived((data) => {
      if (data.message?.senderType !== 'admin') return;
      if (!shouldNotify('GeneralInquiryChat', data.inquiryId)) return;

      const preview = data.message.message?.trim();
      const fallback = t('message.newGeneralInquiryMessage') || 'New 1:1 inquiry message';
      showToast(preview ? preview.slice(0, 80) : fallback, 'info', 4000);
    });
  }, [onMessageReceived, onGeneralInquiryMessageReceived, showToast, locale, navigationRef]);

  return null;
};

export default InquiryNotificationListener;

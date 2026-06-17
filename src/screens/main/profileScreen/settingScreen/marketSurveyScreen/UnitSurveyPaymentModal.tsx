import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../../../../constants';
import { useTranslation } from '../../../../../hooks/useTranslation';
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../context/ToastContext';
import { TradeApplication } from '../../../../../types/tradeApplication';
import { tradeApplicationsApi } from '../../../../../services/tradeApplicationsApi';
import { formatPriceKRW } from '../../../../../utils/i18nHelpers';

type PaymentTab = 'bank' | 'credit_card' | 'deposit';

interface UnitSurveyPaymentModalProps {
  visible: boolean;
  application: TradeApplication | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const UnitSurveyPaymentModal: React.FC<UnitSurveyPaymentModalProps> = ({
  visible,
  application,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [selectedTab, setSelectedTab] = useState<PaymentTab>('bank');
  const [depositorName, setDepositorName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const amountKRW = application?.costEstimate?.amountKRW ?? 0;

  useEffect(() => {
    if (visible) {
      setSelectedTab('bank');
      setDepositorName('');
      setSubmitting(false);
    }
  }, [visible, application?._id]);

  const tabs: { id: PaymentTab; label: string }[] = [
    { id: 'bank', label: t('profile.unitSurvey.tabBankTransfer') },
    { id: 'credit_card', label: t('payment.creditCard') },
    { id: 'deposit', label: t('payment.deposit') },
  ];

  const memberDisplayName =
    user?.name || (user as { userName?: string })?.userName || user?.email || '';

  const handleUseMemberName = () => {
    if (memberDisplayName) {
      setDepositorName(memberDisplayName);
    }
  };

  const handleConfirm = async () => {
    if (!application || submitting) return;

    if (selectedTab === 'bank' && !depositorName.trim()) {
      showToast(t('profile.unitSurvey.depositorNameRequired'), 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await tradeApplicationsApi.payApplication(application._id, {
        paymentMethod: selectedTab,
        amountKRW,
        memberName: selectedTab === 'bank' ? depositorName.trim() : undefined,
      });

      if (res.success) {
        showToast(t('profile.unitSurvey.paymentConfirmSuccess'), 'success');
        onSuccess?.();
        onClose();
      } else {
        showToast(res.error || t('profile.unitSurvey.paymentConfirmFailed'), 'error');
      }
    } catch {
      showToast(t('profile.unitSurvey.paymentConfirmFailed'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!application) return null;

  return (
    <Modal
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']} visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('profile.unitSurvey.paymentModalTitle')}</Text>

          <View style={styles.tabRow}>
            {tabs.map((tab) => {
              const active = selectedTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={styles.tabItem}
                  activeOpacity={0.7}
                  onPress={() => setSelectedTab(tab.id)}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
                  {active && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.amountValue}>{amountKRW.toLocaleString()}</Text>
            <Text style={styles.amountUnit}>{t('profile.unitSurvey.currencyWon')}</Text>
          </View>

          {selectedTab === 'bank' && (
            <View style={styles.depositorRow}>
              <TextInput
                style={styles.depositorInput}
                value={depositorName}
                onChangeText={setDepositorName}
                placeholder={t('profile.unitSurvey.depositorNamePlaceholder')}
                placeholderTextColor={COLORS.gray[400]}
              />
              <TouchableOpacity
                style={styles.useMemberButton}
                activeOpacity={0.85}
                onPress={handleUseMemberName}
              >
                <Text style={styles.useMemberButtonText}>{t('payment.useMemberName')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedTab === 'deposit' && (
            <Text style={styles.depositHint}>
              {t('payment.balance')}: {formatPriceKRW((user as { depositBalance?: number })?.depositBalance ?? 0)}
            </Text>
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              activeOpacity={0.7}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>{t('profile.unitSurvey.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, submitting && styles.confirmButtonDisabled]}
              activeOpacity={0.85}
              onPress={handleConfirm}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.confirmButtonText}>{t('profile.unitSurvey.confirm')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
  },
  title: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    marginBottom: SPACING.md,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: SPACING.sm,
    position: 'relative',
  },
  tabText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.red,
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: 2,
    backgroundColor: COLORS.red,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.smmd,
    marginBottom: SPACING.md,
  },
  amountValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  amountUnit: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.red,
  },
  depositorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  depositorInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    height: 44,
    paddingHorizontal: SPACING.sm,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  useMemberButton: {
    height: 44,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.black,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useMemberButtonText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.white,
  },
  depositHint: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  cancelButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default UnitSurveyPaymentModal;

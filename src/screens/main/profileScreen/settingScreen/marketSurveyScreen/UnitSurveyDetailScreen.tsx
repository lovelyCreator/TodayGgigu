import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from '../../../../../components/Icon';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../../../../constants';
import { RootStackParamList } from '../../../../../types';
import { useTranslation } from '../../../../../hooks/useTranslation';
import { tradeApplicationsApi } from '../../../../../services/tradeApplicationsApi';
import { TradeApplication } from '../../../../../types/tradeApplication';
import { getTradeApplicationStatusLabelKey } from '../../../../../utils/tradeApplicationStatusLabel';
import { formatPriceKRW } from '../../../../../utils/i18nHelpers';

type Nav = StackNavigationProp<RootStackParamList, 'UnitSurveyDetail'>;
type Route = { params?: { applicationId: string; preview?: TradeApplication } };

const BACK_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

const formatDateTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
};

const UnitSurveyDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { t } = useTranslation();
  const applicationId = route.params?.applicationId;
  const preview = route.params?.preview;

  const [application, setApplication] = useState<TradeApplication | null>(preview ?? null);
  const [loading, setLoading] = useState(!preview);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!applicationId) {
      setError(t('profile.unitSurvey.detailNotFound'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await tradeApplicationsApi.getMyApplicationById(applicationId);
      if (res.success && res.data) {
        const app =
          (res.data as { application?: TradeApplication }).application ??
          (res.data as TradeApplication);
        setApplication(app);
      } else {
        setError(res.error || t('profile.unitSurvey.loadFailed'));
      }
    } catch {
      setError(t('profile.unitSurvey.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [applicationId, t]);

  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [loadDetail]),
  );

  const renderSectionHeading = (label: string) => (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionBar} />
      <Text style={styles.sectionHeadingText}>{label}</Text>
    </View>
  );

  const renderInfoRow = (label: string, value?: string | number | null) => {
    if (value == null || value === '') return null;
    return (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{String(value)}</Text>
      </View>
    );
  };

  const openUrl = async (url?: string) => {
    if (!url?.trim()) return;
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    try {
      await Linking.openURL(normalized);
    } catch {
      // silent
    }
  };

  if (loading && !application) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity hitSlop={BACK_HIT_SLOP} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={22} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('profile.unitSurvey.detailTitle')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.red} />
        </View>
      </SafeAreaView>
    );
  }

  if (!application) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity hitSlop={BACK_HIT_SLOP} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={22} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('profile.unitSurvey.detailTitle')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error || t('profile.unitSurvey.detailNotFound')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDetail}>
            <Text style={styles.retryButtonText}>{t('profile.unitSurvey.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusLabel = t(getTradeApplicationStatusLabelKey(application.status));
  const extra = application.extraRequest;
  const costKRW = application.costEstimate?.amountKRW;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity hitSlop={BACK_HIT_SLOP} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.unitSurvey.detailTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <Text style={styles.applicationNo}>
              {t('profile.unitSurvey.applicationNo')} {application.applicationNumber || '-'}
            </Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={styles.summaryDate}>
            {t('profile.unitSurvey.requestedAt')}: {formatDateTime(application.createdAt)}
          </Text>
          {costKRW != null && costKRW > 0 && (
            <Text style={styles.summaryCost}>
              {t('profile.unitSurvey.costEstimate')}: {formatPriceKRW(costKRW)}
            </Text>
          )}
          {!!application.costEstimate?.note && (
            <Text style={styles.summaryNote}>{application.costEstimate.note}</Text>
          )}
        </View>

        {renderSectionHeading(t('profile.unitSurvey.productInfo'))}
        <View style={styles.sectionCard}>
          {application.productInfo?.imageUrl ? (
            <Image
              source={{ uri: application.productInfo.imageUrl }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : null}
          {renderInfoRow(t('profile.unitSurvey.productName'), application.productInfo?.name)}
          {renderInfoRow(t('profile.unitSurvey.productOption'), application.productInfo?.option)}
          {renderInfoRow(
            t('profile.unitSurvey.productQty'),
            application.productInfo?.quantity?.toLocaleString(),
          )}
          {renderInfoRow(
            t('profile.unitSurvey.expectedPrice'),
            application.productInfo?.expectedUnitPriceCNY != null
              ? `¥${application.productInfo.expectedUnitPriceCNY.toLocaleString()}`
              : undefined,
          )}
          {!!application.productInfo?.referenceLink && (
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => openUrl(application.productInfo?.referenceLink)}
            >
              <Text style={styles.infoLabel}>{t('profile.unitSurvey.referenceLink')}</Text>
              <Text style={styles.linkValue} numberOfLines={2}>
                {application.productInfo.referenceLink}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {renderSectionHeading(t('profile.unitSurvey.otherRequests'))}
        <View style={styles.sectionCard}>
          {renderInfoRow(
            t('profile.unitSurvey.logo'),
            extra?.logoRequired
              ? t('profile.unitSurvey.required')
              : t('profile.unitSurvey.notRequired'),
          )}
          {renderInfoRow(
            t('profile.unitSurvey.barcode'),
            extra?.barcodeRequired
              ? t('profile.unitSurvey.required')
              : t('profile.unitSurvey.notRequired'),
          )}
          {renderInfoRow(t('profile.unitSurvey.packaging'), extra?.packagingMethod)}
          {renderInfoRow(t('profile.unitSurvey.memo'), extra?.memo)}
        </View>

        {!!application.attachments?.length && (
          <>
            {renderSectionHeading(t('profile.unitSurvey.attachments'))}
            <View style={styles.sectionCard}>
              {application.attachments.map((file, index) => (
                <TouchableOpacity
                  key={`${file.url}-${index}`}
                  style={styles.attachmentRow}
                  onPress={() => openUrl(file.url)}
                >
                  <Icon name="document-outline" size={18} color={COLORS.red} />
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {file.originalName || file.url.split('/').pop()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {(application.contact?.phone || application.contact?.email) && (
          <>
            {renderSectionHeading(t('profile.unitSurvey.contact'))}
            <View style={styles.sectionCard}>
              {renderInfoRow(t('profile.unitSurvey.contactNumber'), application.contact?.phone)}
              {renderInfoRow(t('profile.unitSurvey.email'), application.contact?.email)}
            </View>
          </>
        )}

        {!!application.statusHistory?.length && (
          <>
            {renderSectionHeading(t('profile.unitSurvey.progressHistory'))}
            <View style={styles.sectionCard}>
              {application.statusHistory.map((entry, index) => (
                <View key={`${entry.at}-${index}`} style={styles.historyRow}>
                  <View style={styles.historyDot} />
                  <View style={styles.historyContent}>
                    <Text style={styles.historyStatus}>
                      {t(getTradeApplicationStatusLabelKey(entry.toStatus))}
                    </Text>
                    <Text style={styles.historyDate}>{formatDateTime(entry.at)}</Text>
                    {!!entry.note && <Text style={styles.historyNote}>{entry.note}</Text>}
                  </View>
                </View>
              ))}
            </View>
          </>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.gray[50],
    gap: SPACING.xs,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  applicationNo: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 85, 0, 0.12)',
  },
  statusBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.red,
  },
  summaryDate: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
  },
  summaryCost: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.red,
    marginTop: SPACING.xs,
  },
  summaryNote: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  sectionBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.sm,
  },
  sectionHeadingText: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  productImage: {
    width: '100%',
    height: 180,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.gray[100],
    marginBottom: SPACING.xs,
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  linkRow: {
    gap: 4,
    paddingTop: SPACING.xs,
  },
  linkValue: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.red,
    textDecorationLine: 'underline',
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  attachmentName: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  historyRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.red,
    marginTop: 6,
  },
  historyContent: {
    flex: 1,
    gap: 2,
  },
  historyStatus: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  historyDate: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.text.secondary,
  },
  historyNote: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  errorText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.red,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
});

export default UnitSurveyDetailScreen;

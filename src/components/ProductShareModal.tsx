import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Linking,
} from 'react-native';
import ShareAppIcon from '../assets/icons/ShareAppIcon';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants';
import { useTranslation } from '../hooks/useTranslation';
import {
  buildProductShareChannelUrl,
  ProductShareChannel,
} from '../utils/productShareLinks';

export type ProductShareModalProps = {
  visible: boolean;
  onClose: () => void;
  productUrl: string;
  productName: string;
  shareMessage: string;
  onShareError?: (message: string) => void;
};

const SHARE_CHANNELS: { id: ProductShareChannel; labelKey: string }[] = [
  { id: 'twitter', labelKey: 'product.share.twitter' },
  { id: 'facebook', labelKey: 'product.share.facebook' },
  { id: 'kakao', labelKey: 'product.share.kakao' },
  { id: 'naver', labelKey: 'product.share.naver' },
  { id: 'whatsapp', labelKey: 'product.share.whatsapp' },
];

const ProductShareModal: React.FC<ProductShareModalProps> = ({
  visible,
  onClose,
  productUrl,
  productName,
  shareMessage,
  onShareError,
}) => {
  const { t } = useTranslation();

  const channels = useMemo(
    () =>
      SHARE_CHANNELS.map((ch) => ({
        ...ch,
        label: t(ch.labelKey),
      })),
    [t],
  );

  const handleChannelPress = async (channel: ProductShareChannel) => {
    const url = buildProductShareChannelUrl(
      channel,
      productUrl,
      productName,
      shareMessage,
    );

    try {
      await Linking.openURL(url);
      onClose();
    } catch {
      onShareError?.(t('product.share.failedToOpen'));
    }
  };

  return (
    <Modal
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlayBackdrop} />
        </TouchableWithoutFeedback>
        <View style={styles.card}>
          <Text style={styles.title}>{t('product.share.title')}</Text>
          <View style={styles.divider} />
          {channels.map((channel, index) => (
            <TouchableOpacity
              key={channel.id}
              style={[
                styles.row,
                index === channels.length - 1 && styles.rowLast,
              ]}
              onPress={() => handleChannelPress(channel.id)}
              activeOpacity={0.7}
            >
              <ShareAppIcon width={22} height={22} color={COLORS.black} />
              <Text style={styles.rowLabel}>{channel.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    zIndex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    ...SHADOWS.lg,
  },
  title: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray[200],
    marginBottom: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '400',
  },
});

export default ProductShareModal;

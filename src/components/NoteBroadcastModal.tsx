import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import Icon from './Icon';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants';
import { BroadcastNote } from '../services/socketService';
import { useTranslation } from '../hooks/useTranslation';

interface NoteBroadcastModalProps {
  note: BroadcastNote | null;
  visible: boolean;
  onClose: () => void;
  onDismiss?: (noteId: string) => void;
  centered?: boolean; // If true, centers modal; if false, shows from bottom
}

const NoteBroadcastModal: React.FC<NoteBroadcastModalProps> = ({
  note,
  visible,
  onClose,
  onDismiss,
  centered = false,
}) => {
  const { t } = useTranslation();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(300));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    if (visible && note) {
      if (centered) {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } else {
      if (centered) {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 300,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [visible, note, fadeAnim, slideAnim, scaleAnim, centered]);

  if (!note) return null;

  // Get note type icon
  const getNoteTypeIcon = (type: BroadcastNote['type']) => {
    switch (type) {
      case 'announcement':
        return 'megaphone';
      case 'maintenance':
        return 'construct';
      case 'update':
        return 'refresh';
      case 'warning':
        return 'warning';
      case 'info':
        return 'information-circle';
      case 'promotion':
        return 'gift';
      default:
        return 'notifications';
    }
  };

  // Get note type color
  const getNoteTypeColor = (type: BroadcastNote['type']) => {
    switch (type) {
      case 'announcement':
        return COLORS.primary;
      case 'maintenance':
        return COLORS.warning;
      case 'update':
        return COLORS.info;
      case 'warning':
        return COLORS.error;
      case 'info':
        return COLORS.info;
      case 'promotion':
        return COLORS.primary;
      default:
        return COLORS.primary;
    }
  };

  // Get note type label
  const getNoteTypeLabel = (type: BroadcastNote['type']) => {
    switch (type) {
      case 'announcement':
        return t('note.type.announcement') || 'Announcement';
      case 'maintenance':
        return t('note.type.maintenance') || 'Maintenance';
      case 'update':
        return t('note.type.update') || 'Update';
      case 'warning':
        return t('note.type.warning') || 'Warning';
      case 'info':
        return t('note.type.info') || 'Information';
      case 'promotion':
        return t('note.type.promotion') || 'Promotion';
      default:
        return t('note.type.announcement') || 'Announcement';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          centered ? styles.overlayCentered : styles.overlayBottom,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.overlayTouchable, centered && styles.overlayTouchableCentered]}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View
            style={[
              styles.modalContainer,
              centered && styles.modalContainerCentered,
              {
                transform: centered 
                  ? [{ scale: scaleAnim }] 
                  : [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={(e) => e.stopPropagation()}
              style={{ flex: 1 }}
            >
              <View style={styles.content}>
                {/* Header with Close Button */}
                <View style={styles.header}>
                  <Text style={styles.noteType}>{getNoteTypeLabel(note.type)}</Text>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Icon name="close" size={24} color={COLORS.text.primary} />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                <View style={styles.contentContainer}>
                  <Text style={styles.contentText}>{note.content}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayBottom: {
    justifyContent: 'flex-end',
  },
  overlayCentered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayTouchableCentered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '80%',
    ...SHADOWS.lg,
  },
  modalContainerCentered: {
    borderRadius: BORDER_RADIUS.xl,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    minWidth: 300,
    maxWidth: '95%',
    maxHeight: '90%',
    minHeight: 400,
  },
  content: {
    flex: 1,
    minHeight: 300,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  noteType: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  contentContainer: {
    padding: SPACING.xl,
    flex: 1,
    minHeight: 200,
  },
  contentText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.text.primary,
    lineHeight: 28,
    fontWeight: '400',
    flexWrap: 'wrap',
  },
});

export default NoteBroadcastModal;


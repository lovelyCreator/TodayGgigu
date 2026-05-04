import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  PanResponder,
  Image,
  TextInput,
  ScrollView,
} from 'react-native';
import Icon from './Icon';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants';
import { useAppSelector } from '../store/hooks';
import { translations } from '../i18n/translations';
import ImagePickerModal from './ImagePickerModal';

const { width, height } = Dimensions.get('window');

interface PhotoCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (data: { quantity: number; request: string; photos: string[] }) => void;
  product: {
    id: string;
    name: string;
    image: string;
    price: number;
  };
}

const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  visible,
  onClose,
  onConfirm,
  product,
}) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const isDismissing = useRef(false);
  
  const [quantity, setQuantity] = useState(1);
  const [request, setRequest] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);

  // i18n
  const locale = useAppSelector((s) => s.i18n.locale);
  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  useEffect(() => {
    if (visible) {
      isDismissing.current = false;
      panY.setValue(0);
      slideAnim.setValue(height);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      // Reset form when modal closes
      setTimeout(() => {
        panY.setValue(0);
        setQuantity(1);
        setRequest('');
        setPhotos([]);
      }, 300);
    }
  }, [visible]);

  const dismissModal = () => {
    if (isDismissing.current) return;
    isDismissing.current = true;
    
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      panY.setValue(0);
      onClose();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          if (isDismissing.current) return;
          isDismissing.current = true;
          onClose();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  const handleQuantityChange = (increment: boolean) => {
    if (increment) {
      setQuantity(prev => prev + 1);
    } else {
      setQuantity(prev => Math.max(1, prev - 1));
    }
  };

  const handleAddPhoto = () => {
    setImagePickerVisible(true);
  };

  const handleTakePhoto = () => {
    // Simulate taking a photo
    const newPhoto = `https://picsum.photos/seed/camera${Date.now()}/200/200`;
    setPhotos(prev => [...prev, newPhoto]);
    setImagePickerVisible(false);
  };

  const handleChooseFromGallery = () => {
    // Simulate choosing from gallery
    const newPhoto = `https://picsum.photos/seed/gallery${Date.now()}/200/200`;
    setPhotos(prev => [...prev, newPhoto]);
    setImagePickerVisible(false);
  };

  const handleConfirm = () => {
    onConfirm({
      quantity,
      request,
      photos,
    });
    dismissModal();
  };

  const handleClose = () => {
    dismissModal();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.container,
                {
                  transform: [
                    { translateY: Animated.add(slideAnim, panY) }
                  ],
                },
              ]}
            >
              <View {...panResponder.panHandlers} style={styles.handleContainer}>
                <View style={styles.handle} />
              </View>
              
              <View style={styles.contentContainer}>
                <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                  {/* Header */}
                  <View style={styles.header}>
                    <Text style={styles.title}>{t('product.photoCapture.title')}</Text>
                    <Text style={styles.subtitle}>
                      {t('product.photoCapture.description')}
                    </Text>
                  </View>

                  {/* Product Info */}
                  <View style={styles.productContainer}>
                    <Image source={{ uri: product.image }} style={styles.productImage} />
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={3}>
                        {product.name}
                      </Text>
                      <View style={styles.quantityRow}>
                        <Text style={styles.quantityLabel}>{t('product.quantity')}</Text>
                        <View style={styles.quantitySelector}>
                          <TouchableOpacity 
                            style={styles.quantityButton}
                            onPress={() => handleQuantityChange(false)}
                          >
                            <Text style={styles.quantityButtonText}>-</Text>
                          </TouchableOpacity>
                          <Text style={styles.quantityText}>{quantity}</Text>
                          <TouchableOpacity 
                            style={styles.quantityButton}
                            onPress={() => handleQuantityChange(true)}
                          >
                            <Text style={styles.quantityButtonText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Photography Template */}
                  <View style={styles.templateContainer}>
                    <Text style={styles.templateTitle}>{t('product.photoCapture.template')}</Text>
                    <TouchableOpacity style={styles.templateButton}>
                      <Text style={styles.templateButtonText}>{t('product.photoCapture.templateOption')}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Photo Upload Section */}
                  <View style={styles.uploadSection}>
                    <Text style={styles.uploadTitle}>{t('product.photoCapture.photo1')}</Text>
                    <Text style={styles.uploadSubtitle}>
                      {t('product.photoCapture.description2')}<Text style={styles.required}>*</Text>
                    </Text>
                    
                    <TextInput
                      style={styles.requestInput}
                      placeholder={t('product.photoCapture.uploadRequest')}
                      value={request}
                      onChangeText={setRequest}
                      multiline
                      textAlignVertical="top"
                    />

                    <View style={styles.photoUploadContainer}>
                      {photos.map((photo, index) => (
                        <View key={index} style={styles.uploadedPhoto}>
                          <Image source={{ uri: photo }} style={styles.uploadedPhotoImage} />
                          <TouchableOpacity
                            style={styles.removePhotoButton}
                            onPress={() => setPhotos(prev => prev.filter((_, i) => i !== index))}
                          >
                            <Icon name="close" size={16} color={COLORS.white} />
                          </TouchableOpacity>
                        </View>
                      ))}
                      
                      <TouchableOpacity
                        style={styles.addPhotoButton}
                        onPress={handleAddPhoto}
                      >
                        <Icon name="add" size={32} color={COLORS.gray[400]} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Fee */}
                  <View style={styles.feeContainer}>
                    <Text style={styles.feeText}>{t('product.photoCapture.fee')}: 0원</Text>
                  </View>
                </ScrollView>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>{t('product.photoCapture.cancel')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmButtonText}>{t('product.photoCapture.confirm')}</Text>
                </TouchableOpacity>
              </View>
              
              <ImagePickerModal
                visible={imagePickerVisible}
                onClose={() => setImagePickerVisible(false)}
                onTakePhoto={handleTakePhoto}
                onChooseFromGallery={handleChooseFromGallery}
              />
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: height * 0.9,
    ...SHADOWS.lg,
  },
  handleContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.gray[300],
    borderRadius: 2,
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    marginTop: SPACING.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[500],
    lineHeight: 20,
  },
  productContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.gray[50],
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.lg,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
    color: COLORS.text.primary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityLabel: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    paddingHorizontal: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  quantityButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '500',
    color: COLORS.text.primary,
  },
  quantityText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '500',
    color: COLORS.text.primary,
    paddingHorizontal: SPACING.lg,
    minWidth: 40,
    textAlign: 'center',
  },
  templateContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  templateTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  templateButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    alignSelf: 'flex-start',
  },
  templateButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  uploadSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  uploadTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  uploadSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
    fontWeight: '500',
  },
  required: {
    color: '#EF4444',
  },
  requestInput: {
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text.primary,
    minHeight: 100,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  photoUploadContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  uploadedPhoto: {
    position: 'relative',
    marginRight: SPACING.sm,
  },
  uploadedPhotoImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoButton: {
    width: 100,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
  },
  feeContainer: {
    paddingHorizontal: SPACING.lg,
    alignItems: 'flex-end',
    marginBottom: SPACING.lg,
  },
  feeText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.md,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default PhotoCaptureModal;
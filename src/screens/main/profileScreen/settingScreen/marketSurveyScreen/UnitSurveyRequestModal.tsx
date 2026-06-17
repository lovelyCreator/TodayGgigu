import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import {
  launchImageLibrary,
  ImageLibraryOptions,
  ImagePickerResponse,
  MediaType,
} from 'react-native-image-picker';
import Icon from '../../../../../components/Icon';
import { COLORS, FONTS, SPACING } from '../../../../../constants';
import { useTranslation } from '../../../../../hooks/useTranslation';
import { requestPhotoLibraryPermission } from '../../../../../utils/permissions';
import { tradeApplicationsApi } from '../../../../../services/tradeApplicationsApi';
import { PickedLocalFile, TradeApplicationType } from '../../../../../types/tradeApplication';
import { useToast } from '../../../../../context/ToastContext';

interface UnitSurveyRequestModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit?: () => void;
  /** Modal title. Defaults to the unit-price-survey request form title. */
  title?: string;
  applicationType?: TradeApplicationType;
}

type RadioValue = 'required' | 'notRequired';

const INITIAL_REFERENCE_LINKS = [''];
const INITIAL_FILES: Array<PickedLocalFile | null> = [null];

const toPickedFile = (asset: NonNullable<ImagePickerResponse['assets']>[number]): PickedLocalFile | null => {
  const uri = asset.uri?.trim();
  if (!uri) return null;
  return {
    uri,
    fileName: asset.fileName,
    type: asset.type,
  };
};

const UnitSurveyRequestModal: React.FC<UnitSurveyRequestModalProps> = ({
  visible,
  onClose,
  onSubmit,
  title,
  applicationType = 'PRICE_SURVEY',
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const modalTitle = title ?? t('profile.unitSurvey.requestForm');
  const [submitting, setSubmitting] = useState(false);

  // 상품정보
  // 상품 이미지 — 첫 화면의 "이미지 업로드" 단추로 갤러리에서 1장 선택.
  // null = 아직 미업로드 상태(+ 아이콘 + 안내문 노출), uri = 미리보기 표시.
  const [productImage, setProductImage] = useState<PickedLocalFile | null>(null);
  const [referenceLinks, setReferenceLinks] = useState<string[]>(['']);
  const [productName, setProductName] = useState('');
  const [productOption, setProductOption] = useState('');
  const [productQty, setProductQty] = useState('');
  const [expectedPrice, setExpectedPrice] = useState('');

  // 기타요청사항
  const [logo, setLogo] = useState<RadioValue>('notRequired');
  const [barcode, setBarcode] = useState<RadioValue>('notRequired');
  const [packaging, setPackaging] = useState('');
  const [memo, setMemo] = useState('');
  const [files, setFiles] = useState<Array<PickedLocalFile | null>>(INITIAL_FILES);

  // 연락방식
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');

  const updateReferenceLink = (index: number, value: string) => {
    setReferenceLinks((prev) => prev.map((v, i) => (i === index ? value : v)));
  };
  const addReferenceLink = () => setReferenceLinks((prev) => [...prev, '']);

  const addFile = () => setFiles((prev) => [...prev, null]);
  const removeFile = (index: number) => {
    setFiles((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : [null]));
  };

  // 상품 이미지 선택 — 갤러리에서 1장 고르면 productImage.uri 에 로컬 경로 저장.
  // 권한 거절 / 사용자 취소 / 응답 오류는 모두 Alert 로 처리. 이미 업로드된
  // 상태에서 다시 누르면 새 이미지로 교체.
  const handleUploadProductImage = async () => {
    const granted = await requestPhotoLibraryPermission();
    if (!granted) {
      Alert.alert(
        t('common.error') || 'Error',
        t('profile.photoLibraryPermissionRequired') ||
          'Photo library permission is required',
      );
      return;
    }
    const options: ImageLibraryOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.7,
      selectionLimit: 1,
    };
    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert(
          t('common.error') || 'Error',
          response.errorMessage ||
            t('profile.failedToPickImage') ||
            'Failed to pick image',
        );
        return;
      }
      const picked = response.assets?.[0] ? toPickedFile(response.assets[0]) : null;
      if (picked) setProductImage(picked);
    });
  };

  // 슬롯별 이미지 업로드 — 갤러리에서 1장 선택해 그 슬롯의 files[index] 에 저장.
  // 권한 거절 / 사용자 취소 / 응답 오류는 모두 Alert 로 처리.
  const handleUploadFile = async (index: number) => {
    const granted = await requestPhotoLibraryPermission();
    if (!granted) {
      Alert.alert(
        t('common.error') || 'Error',
        t('profile.photoLibraryPermissionRequired') ||
          'Photo library permission is required',
      );
      return;
    }
    const options: ImageLibraryOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.7,
      selectionLimit: 1,
    };
    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert(
          t('common.error') || 'Error',
          response.errorMessage ||
            t('profile.failedToPickImage') ||
            'Failed to pick image',
        );
        return;
      }
      const picked = response.assets?.[0] ? toPickedFile(response.assets[0]) : null;
      if (!picked) return;
      setFiles((prev) => prev.map((v, i) => (i === index ? picked : v)));
    });
  };

  const resetForm = () => {
    setProductImage(null);
    setReferenceLinks(INITIAL_REFERENCE_LINKS);
    setProductName('');
    setProductOption('');
    setProductQty('');
    setExpectedPrice('');
    setLogo('notRequired');
    setBarcode('notRequired');
    setPackaging('');
    setMemo('');
    setFiles(INITIAL_FILES);
    setContactNumber('');
    setEmail('');
  };

  const handleConfirm = async () => {
    if (submitting) return;

    if (!productImage?.uri) {
      Alert.alert(t('common.error') || 'Error', t('profile.unitSurvey.validationProductImage'));
      return;
    }
    if (!productName.trim()) {
      Alert.alert(t('common.error') || 'Error', t('profile.unitSurvey.validationProductName'));
      return;
    }
    if (!productOption.trim()) {
      Alert.alert(t('common.error') || 'Error', t('profile.unitSurvey.validationProductOption'));
      return;
    }
    const quantity = Number(productQty);
    if (!productQty.trim() || Number.isNaN(quantity) || quantity <= 0) {
      Alert.alert(t('common.error') || 'Error', t('profile.unitSurvey.validationProductQty'));
      return;
    }
    const expectedUnitPriceCNY = Number(expectedPrice);
    if (!expectedPrice.trim() || Number.isNaN(expectedUnitPriceCNY) || expectedUnitPriceCNY < 0) {
      Alert.alert(t('common.error') || 'Error', t('profile.unitSurvey.validationExpectedPrice'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await tradeApplicationsApi.submitApplication({
        type: applicationType,
        productImage: {
          uri: productImage.uri,
          fileName: productImage.fileName,
          type: productImage.type,
        },
        referenceLinks,
        productName: productName.trim(),
        productOption: productOption.trim(),
        quantity,
        expectedUnitPriceCNY,
        logoRequired: logo === 'required',
        barcodeRequired: barcode === 'required',
        packagingMethod: packaging,
        memo,
        attachmentFiles: files.filter((file): file is PickedLocalFile => Boolean(file?.uri)),
        phone: contactNumber,
        email,
      });

      if (res.success) {
        showToast(t('profile.unitSurvey.submitSuccess'), 'success');
        resetForm();
        onSubmit?.();
        onClose();
      } else {
        showToast(res.error || t('profile.unitSurvey.submitFailed'), 'error');
      }
    } catch {
      showToast(t('profile.unitSurvey.submitFailed'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSectionHeading = (label: string) => (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionBar} />
      <Text style={styles.sectionHeadingText}>{label}</Text>
    </View>
  );

  const renderLabel = (label: string, required?: boolean) => (
    <Text style={styles.fieldLabel}>
      {required && <Text style={styles.requiredMark}>* </Text>}
      {label}
    </Text>
  );

  const renderRadioGroup = (
    value: RadioValue,
    onChange: (v: RadioValue) => void,
  ) => (
    <View style={styles.radioRow}>
      {(['required', 'notRequired'] as RadioValue[]).map((opt) => {
        const selected = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.radioOption, selected && styles.radioOptionSelected]}
            activeOpacity={0.7}
            onPress={() => onChange(opt)}
          >
            <View style={[styles.radioCircle, selected && styles.radioCircleSelected]}>
              {selected && <View style={styles.radioDot} />}
            </View>
            <Text style={styles.radioLabel}>
              {opt === 'required'
                ? t('profile.unitSurvey.required')
                : t('profile.unitSurvey.notRequired')}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <Modal
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerSpacer} />
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={onClose}
            >
              <Icon name="close" size={20} color={COLORS.gray[600]} />
            </TouchableOpacity>
          </View>

          {/* Scrollable body */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ===== 상품정보 ===== */}
            {renderSectionHeading(t('profile.unitSurvey.productInfo'))}

            {renderLabel(t('profile.unitSurvey.productImage'))}
            <TouchableOpacity
              style={styles.imageUploadBox}
              activeOpacity={0.7}
              onPress={handleUploadProductImage}
            >
              {productImage?.uri ? (
                <>
                  {/* 업로드된 이미지 미리보기. 다시 탭하면 새 이미지로 교체.
                      우상단 작은 ✕ 단추로 제거. */}
                  <Image
                    source={{ uri: productImage.uri }}
                    style={styles.imageUploadPreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.imageUploadRemove}
                    onPress={() => setProductImage(null)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Icon name="close" size={12} color={COLORS.white} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.imageUploadPlus}>
                    <Icon name="add" size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.imageUploadText}>
                    {t('profile.unitSurvey.imageUpload')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {renderLabel(t('profile.unitSurvey.referenceLink'))}
            {referenceLinks.map((link, index) => (
              <View key={`link-${index}`} style={styles.linkRow}>
                <TextInput
                  style={[styles.input, styles.linkInput]}
                  placeholder="https://"
                  placeholderTextColor={COLORS.gray[400]}
                  value={link}
                  onChangeText={(v) => updateReferenceLink(index, v)}
                  autoCapitalize="none"
                />
                {index === referenceLinks.length - 1 && (
                  <TouchableOpacity
                    style={styles.addBox}
                    activeOpacity={0.7}
                    onPress={addReferenceLink}
                  >
                    <Icon name="add" size={20} color={COLORS.gray[600]} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {renderLabel(t('profile.unitSurvey.productName'), true)}
            <TextInput
              style={styles.input}
              placeholderTextColor={COLORS.gray[400]}
              value={productName}
              onChangeText={setProductName}
            />

            {renderLabel(t('profile.unitSurvey.productOption'), true)}
            <TextInput
              style={styles.input}
              placeholderTextColor={COLORS.gray[400]}
              value={productOption}
              onChangeText={setProductOption}
            />

            {renderLabel(t('profile.unitSurvey.productQty'), true)}
            <TextInput
              style={styles.input}
              placeholderTextColor={COLORS.gray[400]}
              keyboardType="numeric"
              value={productQty}
              onChangeText={setProductQty}
            />

            {renderLabel(t('profile.unitSurvey.expectedPrice'), true)}
            <TextInput
              style={styles.input}
              placeholderTextColor={COLORS.gray[400]}
              keyboardType="numeric"
              value={expectedPrice}
              onChangeText={setExpectedPrice}
            />

            {/* ===== 기타요청사항 ===== */}
            {renderSectionHeading(t('profile.unitSurvey.otherRequests'))}

            {renderLabel(t('profile.unitSurvey.logo'), true)}
            {renderRadioGroup(logo, setLogo)}

            {renderLabel(t('profile.unitSurvey.barcode'), true)}
            {renderRadioGroup(barcode, setBarcode)}

            {renderLabel(t('profile.unitSurvey.packaging'))}
            <TextInput
              style={styles.input}
              placeholderTextColor={COLORS.gray[400]}
              value={packaging}
              onChangeText={setPackaging}
            />

            {renderLabel(t('profile.unitSurvey.memo'))}
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholderTextColor={COLORS.gray[400]}
              value={memo}
              onChangeText={setMemo}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.fileHeaderRow}>
              {renderLabel(t('profile.unitSurvey.fileAttach'))}
              <TouchableOpacity activeOpacity={0.7} onPress={addFile}>
                <Text style={styles.addFileText}>
                  + {t('profile.unitSurvey.addFile')}
                </Text>
              </TouchableOpacity>
            </View>
            {files.map((file, index) => {
              // 업로드된 파일의 표시명 — fileName 우선, 없으면 uri 경로 사용.
              const fileName = file?.uri
                ? file.fileName ||
                  decodeURIComponent(file.uri.split('/').pop() || file.uri)
                : t('profile.unitSurvey.selectFile');
              return (
                <View key={`file-${index}`} style={styles.fileRow}>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    activeOpacity={0.7}
                    onPress={() => handleUploadFile(index)}
                  >
                    <Text style={styles.uploadButtonText}>
                      {t('profile.unitSurvey.upload')}
                    </Text>
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.fileNameText,
                      file?.uri && { color: COLORS.text.primary },
                    ]}
                    numberOfLines={1}
                  >
                    {fileName}
                  </Text>
                  <TouchableOpacity
                    style={styles.fileDeleteButton}
                    activeOpacity={0.7}
                    onPress={() => removeFile(index)}
                  >
                    <Text style={styles.fileDeleteText}>
                      {t('profile.unitSurvey.deleteLabel')}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
            <Text style={styles.fileLimitNote}>
              {t('profile.unitSurvey.fileLimit')}
            </Text>

            {/* ===== 연락방식 ===== */}
            {renderSectionHeading(t('profile.unitSurvey.contact'))}

            {renderLabel(t('profile.unitSurvey.contactNumber'))}
            <TextInput
              style={styles.input}
              placeholderTextColor={COLORS.gray[400]}
              keyboardType="phone-pad"
              value={contactNumber}
              onChangeText={setContactNumber}
            />

            {renderLabel(t('profile.unitSurvey.email'))}
            <TextInput
              style={styles.input}
              placeholderTextColor={COLORS.gray[400]}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </ScrollView>

          {/* Fixed footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              activeOpacity={0.7}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>
                {t('profile.unitSurvey.cancel')}
              </Text>
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
                <Text style={styles.confirmButtonText}>
                  {t('profile.unitSurvey.confirm')}
                </Text>
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
    maxWidth: 420,
    maxHeight: '88%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  // Header
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  headerSpacer: {
    width: 28,
  },
  modalTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text.primary,
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Body
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  // Section heading
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
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
  // Fields
  fieldLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[700],
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  requiredMark: {
    color: COLORS.error,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    height: 44,
    paddingHorizontal: SPACING.sm,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
    backgroundColor: COLORS.white,
  },
  textarea: {
    height: 110,
    paddingTop: SPACING.sm,
  },
  // Image upload
  imageUploadBox: {
    width: 96,
    height: 96,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    // 미리보기 이미지가 박스 가장자리를 침범하지 않도록.
    overflow: 'hidden',
  },
  imageUploadPlus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.lightRed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  imageUploadText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[500],
  },
  // 업로드된 상품 이미지 미리보기 — 박스 전체를 채움.
  imageUploadPreview: {
    width: '100%',
    height: '100%',
  },
  // 우상단 작은 ✕ 단추 — 업로드된 이미지를 제거.
  imageUploadRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Reference link
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  linkInput: {
    flex: 1,
  },
  addBox: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Radio
  radioRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  radioOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    height: 44,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
  },
  radioOptionSelected: {
    borderColor: COLORS.primary,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.gray[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  radioLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  // File attach
  fileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addFileText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: SPACING.md,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  uploadButton: {
    paddingHorizontal: SPACING.sm,
    height: 32,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[700],
    fontWeight: '600',
  },
  fileNameText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[400],
  },
  fileDeleteButton: {
    paddingHorizontal: SPACING.sm,
    height: 32,
    borderWidth: 1,
    borderColor: COLORS.red,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileDeleteText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.red,
    fontWeight: '600',
  },
  fileLimitNote: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.gray[400],
    marginTop: SPACING.xs,
  },
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  cancelButton: {
    paddingHorizontal: SPACING.lg,
    height: 42,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray[700],
    fontWeight: '600',
  },
  confirmButton: {
    paddingHorizontal: SPACING.lg,
    height: 42,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.white,
    fontWeight: '700',
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
});

export default UnitSurveyRequestModal;

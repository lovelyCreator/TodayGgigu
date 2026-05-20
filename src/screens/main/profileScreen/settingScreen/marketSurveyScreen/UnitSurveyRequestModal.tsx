import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
} from 'react-native';
import Icon from '../../../../../components/Icon';
import { COLORS, FONTS, SPACING } from '../../../../../constants';
import { useTranslation } from '../../../../../hooks/useTranslation';

interface UnitSurveyRequestModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit?: () => void;
  /** Modal title. Defaults to the unit-price-survey request form title. */
  title?: string;
}

type RadioValue = 'required' | 'notRequired';

/** 단가조사요청서 - UI-only request form modal. */
const UnitSurveyRequestModal: React.FC<UnitSurveyRequestModalProps> = ({
  visible,
  onClose,
  onSubmit,
  title,
}) => {
  const { t } = useTranslation();
  const modalTitle = title ?? t('profile.unitSurvey.requestForm');

  // 상품정보
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
  const [files, setFiles] = useState<string[]>(['']);

  // 연락방식
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');

  const updateReferenceLink = (index: number, value: string) => {
    setReferenceLinks((prev) => prev.map((v, i) => (i === index ? value : v)));
  };
  const addReferenceLink = () => setReferenceLinks((prev) => [...prev, '']);

  const addFile = () => setFiles((prev) => [...prev, '']);
  const removeFile = (index: number) => {
    setFiles((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : ['']));
  };

  const handleConfirm = () => {
    onSubmit?.();
    onClose();
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
            <TouchableOpacity style={styles.imageUploadBox} activeOpacity={0.7}>
              <View style={styles.imageUploadPlus}>
                <Icon name="add" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.imageUploadText}>
                {t('profile.unitSurvey.imageUpload')}
              </Text>
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
            {files.map((_, index) => (
              <View key={`file-${index}`} style={styles.fileRow}>
                <TouchableOpacity style={styles.uploadButton} activeOpacity={0.7}>
                  <Text style={styles.uploadButtonText}>
                    {t('profile.unitSurvey.upload')}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.fileNameText} numberOfLines={1}>
                  {t('profile.unitSurvey.selectFile')}
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
            ))}
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
              style={styles.confirmButton}
              activeOpacity={0.85}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>
                {t('profile.unitSurvey.confirm')}
              </Text>
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
});

export default UnitSurveyRequestModal;

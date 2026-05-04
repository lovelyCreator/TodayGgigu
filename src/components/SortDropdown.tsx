import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants';
import ArrowDropDownIcon from '../assets/icons/ArrowDropDownIcon';
import CheckIcon from '../assets/icons/CheckIcon';

interface SortOption {
  label: string;
  value: string;
}

interface SortDropdownProps {
  options: SortOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  textColor?: string;
  iconColor?: string;
}

const SortDropdown: React.FC<SortDropdownProps> = ({
  options,
  selectedValue,
  onSelect,
  textColor = COLORS.black,
  iconColor = COLORS.black,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [buttonLayout, setButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const buttonRef = useRef<View>(null);

  const handleButtonPress = () => {
    buttonRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setButtonLayout({ x: pageX, y: pageY, width, height });
      setShowMenu(true);
    });
  };

  const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || options[0]?.label || '';

  return (
    <View style={styles.container} ref={buttonRef}>
      <TouchableOpacity
        style={styles.button}
        onPress={handleButtonPress}
      >
        <Text style={[styles.buttonText, { color: textColor }]}>
          {selectedLabel}
        </Text>
        <ArrowDropDownIcon width={12} height={12} color={iconColor} />
      </TouchableOpacity>

      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View 
            style={[
              styles.menuContainer,
              {
                position: 'absolute',
                top: buttonLayout.y + buttonLayout.height + 8,
                left: buttonLayout.x,
              }
            ]}
          >
            <View style={styles.menu}>
              {options.map((option, index) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.menuItem,
                    selectedValue === option.value && styles.menuItemActive,
                    index === 0 && styles.menuItemFirst,
                    index === options.length - 1 && styles.menuItemLast,
                  ]}
                  onPress={() => {
                    onSelect(option.value);
                    setShowMenu(false);
                  }}
                >
                  <Text
                    style={[
                      styles.menuItemText,
                      selectedValue === option.value && styles.menuItemTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selectedValue === option.value && (
                    <CheckIcon size={20} color={COLORS.white} isSelected={true} circleColor={COLORS.text.red} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING.xs,
  },
  buttonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    alignItems: 'flex-start',
  },
  menu: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.md,
    minWidth: 150,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  menuItemFirst: {
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
  },
  menuItemLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: BORDER_RADIUS.lg,
    borderBottomRightRadius: BORDER_RADIUS.lg,
  },
  menuItemActive: {
    backgroundColor: COLORS.gray[50],
  },
  menuItemText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text.primary,
  },
  menuItemTextActive: {
    fontWeight: '600',
    color: COLORS.text.red,
  },
});

export default SortDropdown;



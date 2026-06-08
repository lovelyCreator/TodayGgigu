import React from 'react';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Import TSX icon components
import SearchIcon from '../assets/icons/SearchIcon';
import MoreHorizIcon from '../assets/icons/MoreHorizIcon';
import HistoryIcon from '../assets/icons/HistoryIcon';
import FollowedStoreIcon from '../assets/icons/FollowedStoreIcon';
import BonusIcon from '../assets/icons/BonusIcon';
import ShoppingCreditsIcon from '../assets/icons/ShoppingCreditsIcon';
import NoteIcon from '../assets/icons/NoteIcon';
import ContentCopyIcon from '../assets/icons/ContentCopyIcon';
import ArrowForwardIcon from '../assets/icons/ArrowForwardIcon';
import ArrowUpIcon from '../assets/icons/ArrowUpIcon';
import ArrowDownIcon from '../assets/icons/ArrowDownIcon';
import PlusIcon from '../assets/icons/PlusIcon';
import MinusIcon from '../assets/icons/MinusIcon';
import ShareAppIcon from '../assets/icons/ShareAppIcon';
import EyeIcon from '../assets/icons/EyeIcon';
import EyeOffIcon from '../assets/icons/EyeOffIcon';
import CheckIcon from '../assets/icons/CheckIcon';
import CloseIcon from '../assets/icons/CloseIcon';
import CloseCircleIcon from '../assets/icons/CloseCircleIcon';
import PencilIcon from '../assets/icons/PencilIcon';
import HeartOutlineIcon from '../assets/icons/HeartOutlineIcon';
import CheckmarkIcon from '../assets/icons/CheckmarkIcon';
import CheckmarkDoneIcon from '../assets/icons/CheckmarkDoneIcon';
import LinkIcon from '../assets/icons/LinkIcon';
import GiftIcon from '../assets/icons/GiftIcon';
import ImageIcon from '../assets/icons/ImageIcon';
import ChevronForwardIcon from '../assets/icons/ChevronForwardIcon';
import ArrowBackIcon from '../assets/icons/ArrowBackIcon';
import StarIcon from '../assets/icons/StarIcon';
import StarOutlineIcon from '../assets/icons/StarOutlineIcon';
import HeartIcon from '../assets/icons/HeartIcon';
import CameraIcon from '../assets/icons/CameraIcon';
import DownloadIcon from '../assets/icons/DownloadIcon';
import FilterIcon from '../assets/icons/FilterIcon';
import BasketIcon from '../assets/icons/BasketIcon';
import InfoCircleIcon from '../assets/icons/InfoCircleIcon';
import HelpCircleIcon from '../assets/icons/HelpCircleIcon';
import ShieldCheckIcon from '../assets/icons/ShieldCheckIcon';
import AddCircleIcon from '../assets/icons/AddCircleIcon';
import LocationIcon from '../assets/icons/LocationIcon';
import TicketIcon from '../assets/icons/TicketIcon';
import CalendarIcon from '../assets/icons/CalendarIcon';
import WarningIcon from '../assets/icons/WarningIcon';
import CartIcon from '../assets/icons/CartIcon';
import WalletIcon from '../assets/icons/WalletIcon';
import ChatBubbleIcon from '../assets/icons/ChatBubbleIcon';
import CardIcon from '../assets/icons/CardIcon';
import AirplaneIcon from '../assets/icons/AirplaneIcon';
import CubeIcon from '../assets/icons/CubeIcon';
import CallIcon from '../assets/icons/CallIcon';
import DocumentIcon from '../assets/icons/DocumentIcon';
import PersonIcon from '../assets/icons/PersonIcon';
import SendIcon from '../assets/icons/SendIcon';
import TrashIcon from '../assets/icons/TrashIcon';
import PaymentIcon from '../assets/icons/PaymentIcon';
import ChevronBackIcon from '../assets/icons/ChevronBackIcon';
import TimeIcon from '../assets/icons/TimeIcon';
import MailIcon from '../assets/icons/MailIcon';
import ThumbsUpIcon from '../assets/icons/ThumbsUpIcon';
import ThumbsDownIcon from '../assets/icons/ThumbsDownIcon';
import ReceiptIcon from '../assets/icons/ReceiptIcon';
import CreateIcon from '../assets/icons/CreateIcon';
import BoatIcon from '../assets/icons/BoatIcon';
import DeliveryIcon from '../assets/icons/DeliveryIcon';
import PackageIcon from '../assets/icons/PackageIcon';
import FlashIcon from '../assets/icons/FlashIcon';
import RocketIcon from '../assets/icons/RocketIcon';
import NotificationIcon from '../assets/icons/NotificationIcon';
import MinusCircleIcon from '../assets/icons/MinusCircleIcon';
import TodayGgiguWordmarkIcon from '../assets/icons/TodayGgiguWordmarkIcon';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

/**
 * Mapping of icon names to TSX icon components
 */
const iconComponentMap: { [key: string]: React.ComponentType<any> } = {
  'search': SearchIcon,
  'more-horiz': MoreHorizIcon,
  'ellipsis-horizontal': MoreHorizIcon,
  'history': HistoryIcon,
  'followedstore': FollowedStoreIcon,
  'bonus': BonusIcon,
  'shopping-credits': ShoppingCreditsIcon,
  'note': NoteIcon,
  'content-copy': ContentCopyIcon,
  'arrow-forward': ArrowForwardIcon,
  'chevron-up': ArrowUpIcon,
  'arrow-up': ArrowUpIcon,
  'chevron-down': ArrowDownIcon,
  'arrow-down': ArrowDownIcon,
  'add': PlusIcon,
  'remove': MinusIcon,
  'share-social-outline': ShareAppIcon,
  'eye': EyeIcon,
  'eye-outline': EyeIcon,
  'eye-off': EyeOffIcon,
  'eye-off-outline': EyeOffIcon,
  'checkmark-circle': CheckIcon,
  'ellipse-outline': CheckIcon,
  'close': CloseIcon,
  'close-outline': CloseIcon,
  'close-circle': CloseCircleIcon,
  'pencil': PencilIcon,
  'heart-outline': HeartOutlineIcon,
  'checkmark': CheckmarkIcon,
  'checkmark-done': CheckmarkDoneIcon,
  'link-outline': LinkIcon,
  'gift-outline': GiftIcon,
  'image-outline': ImageIcon,
  'images-outline': ImageIcon,
  'chevron-forward': ChevronForwardIcon,
  'arrow-back': ArrowBackIcon,
  'star': StarIcon,
  'star-outline': StarOutlineIcon,
  'heart': HeartIcon,
  'camera': CameraIcon,
  'camera-outline': CameraIcon,
  'download-outline': DownloadIcon,
  'filter': FilterIcon,
  'basket-outline': BasketIcon,
  'information-circle-outline': InfoCircleIcon,
  'help-circle-outline': HelpCircleIcon,
  'shield-checkmark-outline': ShieldCheckIcon,
  'add-circle-outline': AddCircleIcon,
  'remove-circle-outline': MinusCircleIcon,
  'location': LocationIcon,
  'location-outline': LocationIcon,
  'ticket': TicketIcon,
  'ticket-outline': TicketIcon,
  'calendar-outline': CalendarIcon,
  'warning': WarningIcon,
  'warning-outline': WarningIcon,
  'cart-outline': CartIcon,
  'cart': CartIcon,
  'wallet': WalletIcon,
  'chatbubble': ChatBubbleIcon,
  'chatbubbles': ChatBubbleIcon,
  'chatbubbles-outline': ChatBubbleIcon,
  'card': CardIcon,
  'card-outline': CardIcon,
  'airplane': AirplaneIcon,
  'cube': CubeIcon,
  'business-outline': CubeIcon,
  'warehouse-outline': CubeIcon,
  'package': PackageIcon,
  'delivery': DeliveryIcon,
  'car-outline': DeliveryIcon,
  'truck': DeliveryIcon,
  'call': CallIcon,
  'document': DocumentIcon,
  'document-text': DocumentIcon,
  'document-text-outline': DocumentIcon,
  'person': PersonIcon,
  'send': SendIcon,
  'trash': TrashIcon,
  'trash-outline': TrashIcon,
  'logo-html5': PaymentIcon, // Using PaymentIcon as generic payment icon
  'chevron-back': ChevronBackIcon,
  'time-outline': TimeIcon,
  'mail-outline': MailIcon,
  'thumbs-up': ThumbsUpIcon,
  'thumbs-down': ThumbsDownIcon,
  'receipt': ReceiptIcon,
  'receipt-outline': ReceiptIcon,
  'checkmark-circle-outline': CheckIcon,
  'create-outline': CreateIcon,
  'boat': BoatIcon,
  'flash': FlashIcon,
  'rocket': RocketIcon,
  'notifications': NotificationIcon,
  'notifications-outline': NotificationIcon,
  /** Brand wordmark (raster); use `Icon` with name or import component for custom width */
  'todayggigu-wordmark': TodayGgiguWordmarkIcon,
};

/**
 * Icon name mapping from Ionicons to MaterialIcons/MaterialCommunityIcons
 * This allows us to use Ionicons-style names while using Material icons
 * Used as fallback when SVG is not available
 */
const iconNameMap: { [key: string]: { name: string; library: 'material' | 'materialCommunity' } } = {
  // Arrows
  'arrow-back': { name: 'arrow-back', library: 'material' },
  'arrow-forward': { name: 'arrow-forward', library: 'material' },
  'chevron-up': { name: 'keyboard-arrow-up', library: 'material' },
  'chevron-down': { name: 'keyboard-arrow-down', library: 'material' },
  'chevron-forward': { name: 'chevron-right', library: 'material' },
  
  // Common actions
  'heart': { name: 'favorite', library: 'material' },
  'heart-outline': { name: 'favorite-border', library: 'material' },
  'star': { name: 'star', library: 'material' },
  'star-outline': { name: 'star-border', library: 'material' },
  'search': { name: 'search', library: 'material' },
  'add': { name: 'add', library: 'material' },
  'close': { name: 'close', library: 'material' },
  'checkmark': { name: 'check', library: 'material' },
  'checkmark-done': { name: 'done-all', library: 'material' },
  'send': { name: 'send', library: 'material' },
  
  // UI elements
  'ellipsis-horizontal': { name: 'more-horiz', library: 'material' },
  'ellipsis-vertical': { name: 'more-vert', library: 'material' },
  'menu': { name: 'menu', library: 'material' },
  'filter': { name: 'filter-list', library: 'material' },
  'refresh': { name: 'refresh', library: 'material' },
  
  // Media
  'camera-outline': { name: 'camera-alt', library: 'material' },
  'images-outline': { name: 'image', library: 'material' },
  'image-outline': { name: 'image', library: 'material' },
  
  // Social/Sharing
  'share-social-outline': { name: 'share', library: 'material' },
  'download-outline': { name: 'download', library: 'material' },
  'link-outline': { name: 'link', library: 'material' },
  'gift-outline': { name: 'card-giftcard', library: 'material' },
  
  // Shopping
  'basket-outline': { name: 'shopping-basket', library: 'material' },
  'cart-outline': { name: 'shopping-cart', library: 'material' },
  
  // Security
  'shield-checkmark-outline': { name: 'verified-user', library: 'material' },
  
  // Notifications
  'notifications-outline': { name: 'notifications-none', library: 'material' },
};

/**
 * Unified Icon component that uses TSX icon components from assets/icons when available,
 * otherwise falls back to MaterialIcons/MaterialCommunityIcons
 */
const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 24, 
  color = '#000', 
  style 
}) => {
  const iconName = name.toLowerCase();
  
  // First, check if we have a TSX icon component for this icon
  const IconComponent = iconComponentMap[iconName];
  if (IconComponent) {
    // Special handling for CheckIcon (checkmark-circle and ellipse-outline)
    if (iconName === 'checkmark-circle' || iconName === 'ellipse-outline') {
      const isSelected = iconName === 'checkmark-circle';
      return (
        <CheckIcon 
          size={size} 
          color={color}
          isSelected={isSelected}
          circleColor={isSelected ? color : undefined}
        />
      );
    }

    if (iconName === 'todayggigu-wordmark') {
      const wordmarkHeight = size;
      const wordmarkWidth = Math.round((size * 200) / 30);
      return (
        <TodayGgiguWordmarkIcon
          width={wordmarkWidth}
          height={wordmarkHeight}
          style={style}
        />
      );
    }
    
    return (
      <IconComponent 
        width={size} 
        height={size} 
        color={color}
        style={style}
      />
    );
  }
  
  // Fallback to vector icons
  const iconMapping = iconNameMap[iconName];
  
  if (iconMapping) {
    const VectorIconComponent = iconMapping.library === 'material' 
      ? MaterialIcons 
      : MaterialCommunityIcons;
    
    return (
      <VectorIconComponent 
        name={iconMapping.name as any} 
        size={size} 
        color={color} 
        style={style}
      />
    );
  }
  
  // Final fallback: try MaterialIcons with the original name
  return (
    <MaterialIcons 
      name={name as any} 
      size={size} 
      color={color} 
      style={style}
    />
  );
};

export default Icon;

import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../../types';

/** Legacy route: same wallet UI as Coupon screen with point tab selected. */
const PointDetailScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    navigation.replace('Coupon', { initialSection: 'point' });
  }, [navigation]);

  return null;
};

export default PointDetailScreen;

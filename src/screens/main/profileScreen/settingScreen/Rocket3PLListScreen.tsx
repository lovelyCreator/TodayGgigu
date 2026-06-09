/**
 * 로켓/3PL 주문 리스트. 내주문 카드의 `로켓/3PL` 탭이 활성일 때 셀을 누르면
 * 진입한다. 페지 구성·9개 탭 라벨은 구매대행(BuyListScreen)과 동일하고,
 * 도메인만 분리되므로 카운트와 백엔드 자료만 다르다. 백엔드 연결 전까지는
 * OrderListPlaceholderScreen 으로 빈 상태 유지.
 */

import React from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../../types';
import OrderListPlaceholderScreen, {
  OrderListPlaceholderTab,
} from './OrderListPlaceholderScreen';

type RouteParams = RouteProp<RootStackParamList, 'Rocket3PLList'>;
type TabKey = NonNullable<NonNullable<RouteParams['params']>['initialTab']>;

type Rocket3PLListScreenProps = {
  embedded?: boolean;
  initialTab?: TabKey | 'all';
};

// 9개 단계 — 구매대행 카드와 동일한 라벨 셋. (전체주문은 'all' 키로 별도)
const TABS: OrderListPlaceholderTab<TabKey>[] = [
  { key: 'category', labelKey: 'profile.quoteWaiting' },
  { key: 'unpaid', labelKey: 'profile.customerPayment' },
  { key: 'to_be_shipped', labelKey: 'profile.orderPurchasing' },
  { key: 'processed', labelKey: 'profile.orderWarehoused' },
  { key: 'shipping_delay', labelKey: 'profile.shipmentWaiting' },
  { key: 'shipped', labelKey: 'profile.orderCompleted' },
];

const Rocket3PLListScreen: React.FC<Rocket3PLListScreenProps> = ({
  embedded = false,
  initialTab: initialTabProp,
}) => {
  const route = useRoute<RouteParams>();
  const initialTab =
    initialTabProp ?? (route.params?.initialTab as TabKey | 'all' | undefined) ?? 'all';

  return (
    <OrderListPlaceholderScreen
      embedded={embedded}
      titleKey="profile.titleRocket3pl"
      tabs={TABS}
      initialTab={initialTab}
    />
  );
};

export default Rocket3PLListScreen;

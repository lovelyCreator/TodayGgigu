import React, { lazy, Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { COLORS } from '../../constants';

const SellerDetailScreenComponent = lazy(() => import('../main/SellerDetailScreen'));

const SellerDetailScreen = (props: any) => (
  <Suspense
    fallback={
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    }
  >
    <SellerDetailScreenComponent {...props} />
  </Suspense>
);

export default SellerDetailScreen;

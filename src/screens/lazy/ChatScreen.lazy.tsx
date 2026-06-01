import React, { lazy, Suspense } from 'react';
import { ScreenSkeleton } from '../../components/Skeleton';

const LazyChatScreen = lazy(() => import('../main/chatScreen/ChatScreen'));

const ChatScreenWithSuspense = (props: any) => (
  <Suspense fallback={<ScreenSkeleton variant="list" />}>
    <LazyChatScreen {...props} />
  </Suspense>
);

export default ChatScreenWithSuspense;

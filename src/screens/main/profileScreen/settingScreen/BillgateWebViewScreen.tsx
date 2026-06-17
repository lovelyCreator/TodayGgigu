/**
 * BillGate 신용카드 결제 WebView.
 *
 * OrderPaymentScreen 에서 신용카드 결제 제출 시 backend 의
 * `POST /v1/payments/billgate/prepare` 응답으로 받은 `paymentData` + script URL
 * 을 이 화면으로 넘겨 받아 WebView 에 HTML 을 직접 주입한다.
 *
 * HTML 흐름:
 *   1) gx_web_client.js 를 <script src> 로 로드
 *   2) 모든 paymentData 필드를 <form> 의 hidden input 으로 채움
 *   3) onload 시 BillGate 의 결제창을 띄움
 *
 * 결제 완료/취소는 BillGate 가 RETURN_URL / CANCEL_URL 로 리다이렉트하며,
 * 그 URL 은 `api.todayggigu.kr` / `todayggigu.kr` 도메인이므로 onNavigationStateChange
 * 에서 감지해 WebView 닫고 BuyList 로 돌아간다.
 */
import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from '../../../../components/Icon';

import { COLORS, FONTS, SPACING } from '../../../../constants/index';
import { useTranslation } from '../../../../hooks/useTranslation';
import { useToast } from '../../../../context/ToastContext';
import { RootStackParamList } from '../../../../types';

type BillgateWebViewRouteProp = RouteProp<RootStackParamList, 'BillgateWebView'>;
type BillgateWebViewNavigationProp = StackNavigationProp<RootStackParamList, 'BillgateWebView'>;

/**
 * BillGate WebView 에 주입할 HTML 을 만든다.
 *
 * 결정적 통합 방식 (레퍼런스 앱 todaymall.kr 로그에서 확인됨):
 *   - `https://pay.billgate.net/credit/certify.jsp` 에 paymentData 를 form POST 로 직접 submit
 *   - gx_web_client.js 같은 client SDK 는 불필요 — certify.jsp 가 자체적으로 카드사 선택 UI 와
 *     popup 결제창 (popup_*card_*.html) 을 모두 처리한다
 *   - 응답 페이지가 WebView 에 그대로 표시되며, 사용자가 카드 선택 + 인증 완료 시
 *     BillGate 가 RETURN_URL 로 redirect → onNavigationStateChange 가 감지
 */
const BILLGATE_CERTIFY_URL = 'https://pay.billgate.net/credit/certify.jsp';

/**
 * 모든 페이지 로드 시 WebView 에 주입되는 스크립트.
 *
 * BillGate 의 certify.jsp 와 popup_*card_*.html 은 viewport 가
 * `width=device-width, initial-scale=1` 로 잠겨 있어 모바일 화면 너비로
 * 강제 축소된다. 그 결과 카드사 버튼 영역이 화면 너비에 맞게 wrap 되지
 * 못하고 잘려서 보이고, 가로 스크롤이 발생하지 않는다.
 *
 * 해결: 페이지의 모든 viewport 메타를 width=900 (BillGate 의 디자인 너비)
 * 으로 강제 교체. 이러면 WebView 가 페이지 너비를 인식해 사용자가 가로
 * 스크롤로 모든 콘텐츠에 접근 가능하고, scalesPageToFit/built-in zoom 으로
 * 자동 축소 표시 + 핀치-줌도 사용 가능.
 *
 * 추가로 body 의 `overflow: visible !important` 와 `min-width` 를 명시해
 * BillGate 자체 CSS 가 overflow:hidden 을 걸어도 스크롤이 동작하게 함.
 */
const injectedViewportOverride = `
(function () {
  try {
    var DESIGN_WIDTH = 900;
    function applyViewport() {
      var metas = document.querySelectorAll('meta[name="viewport"]');
      for (var i = 0; i < metas.length; i++) {
        metas[i].parentNode && metas[i].parentNode.removeChild(metas[i]);
      }
      var m = document.createElement('meta');
      m.name = 'viewport';
      // 디자인 너비(900px)를 기기 화면 너비에 맞춰 스케일 → 폰·태블릿 모두 화면을 꽉 채운다.
      // (고정 0.45 는 폰 기준이라 iPad 에서 작게 떠 여백이 컸음)
      var screenW = (window.screen && window.screen.width) ? window.screen.width : 405;
      var fillScale = Math.max(0.3, screenW / DESIGN_WIDTH);
      m.content = 'width=' + DESIGN_WIDTH + ', initial-scale=' + fillScale + ', minimum-scale=0.3, maximum-scale=3.0, user-scalable=yes';
      (document.head || document.documentElement).appendChild(m);
      if (document.documentElement) {
        document.documentElement.style.minWidth = DESIGN_WIDTH + 'px';
        document.documentElement.style.overflowX = 'auto';
      }
      if (document.body) {
        document.body.style.minWidth = DESIGN_WIDTH + 'px';
        document.body.style.overflowX = 'auto';
        document.body.style.overflowY = 'auto';
      }
      // 좌우 여백 제거 — body/html 기본 마진·패딩을 0 으로, 가운데 정렬(margin:auto)·
      // max-width 로 좁아진 상위 컨테이너를 풀너비로 펴서 결제창이 화면을 꽉 채우게 한다.
      var STYLE_ID = 'rn-fullwidth-style';
      if (!document.getElementById(STYLE_ID)) {
        var st = document.createElement('style');
        st.id = STYLE_ID;
        st.innerHTML =
          'html,body{margin:0!important;padding:0!important;}' +
          'body>*{margin-left:0!important;margin-right:0!important;max-width:100%!important;width:100%!important;box-sizing:border-box!important;}';
        (document.head || document.documentElement).appendChild(st);
      }
    }
    applyViewport();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyViewport);
    }
    window.addEventListener('load', applyViewport);
  } catch (e) {
    /* ignore */
  }
})();
true;
`;

const buildBillgateHtml = (
  paymentData: Record<string, string>,
): string => {
  const escapeHtml = (s: string): string =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const hiddenInputs = Object.entries(paymentData)
    .map(([k, v]) => `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}" />`)
    .join('\n      ');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <!--
    NOTE: viewport 메타를 의도적으로 생략한다. BillGate 의 certify.jsp 는
    데스크탑 너비로 디자인되어 viewport 가 device-width 로 제한되면
    카드사 버튼 영역이 잘려서 보인다. viewport 를 두지 않으면 WebView 가
    페이지 자체 너비를 사용하고 사용자가 가로 스크롤로 모든 영역을 볼 수 있다.
  -->
  <title>BillGate Payment</title>
  <style>
    html, body { margin: 0; padding: 0; min-height: 100%; background: #fff;
                 font-family: -apple-system, system-ui, sans-serif; color: #111; }
    .loader { text-align: center; padding-top: 80px; }
    .msg { font-size: 15px; color: #555; margin-bottom: 16px; }
    .spinner { width: 32px; height: 32px; border: 3px solid #ddd; border-top-color: #d63f3f;
               border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="loader">
    <div class="msg">결제창을 준비하고 있습니다...</div>
    <div class="spinner"></div>
  </div>

  <form id="billgateForm" name="billgateForm" method="post"
        action="${BILLGATE_CERTIFY_URL}" accept-charset="EUC-KR">
      ${hiddenInputs}
  </form>

  <script>
    (function () {
      function submitForm() {
        try {
          document.getElementById('billgateForm').submit();
        } catch (err) {
          try {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage &&
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error', message: String(err && err.message || err)
              }));
          } catch (e) { /* ignore */ }
        }
      }
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(submitForm, 50);
      } else {
        window.addEventListener('load', function () { setTimeout(submitForm, 50); });
      }
    })();
  </script>
</body>
</html>`;
};

const BillgateWebViewScreen: React.FC = () => {
  const route = useRoute<BillgateWebViewRouteProp>();
  const navigation = useNavigation<BillgateWebViewNavigationProp>();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const webviewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const completedRef = useRef(false);

  const { paymentData, orderId } = route.params;

  const html = useMemo(
    () => buildBillgateHtml(paymentData || {}),
    [paymentData],
  );

  // RETURN_URL / CANCEL_URL 에 도달하면 결제 흐름 종료.
  const handleNavigationStateChange = (state: WebViewNavigation) => {
    if (completedRef.current) return;
    const url = state.url || '';
    const isReturn = url.includes('/v1/payments/billgate/return') ||
      (paymentData.RETURN_URL && url.startsWith(paymentData.RETURN_URL));
    const isCancel = url.includes('/payment/cancel') ||
      (paymentData.CANCEL_URL && url.startsWith(paymentData.CANCEL_URL));
    if (isReturn) {
      completedRef.current = true;
      showToast(t('profile.unitSurvey.paymentConfirmSuccess'), 'success');
      (navigation as any).navigate('BuyList', {
        domain: 'purchase_agency',
        initialTab: 'purchase_agency',
      });
    } else if (isCancel) {
      completedRef.current = true;
      showToast(t('profile.unitSurvey.paymentConfirmFailed'), 'info');
      navigation.goBack();
    }
  };

  const handleClose = () => {
    if (completedRef.current) return;
    navigation.goBack();
  };

  const handleMessage = (event: any) => {
    try {
      const msg = JSON.parse(event?.nativeEvent?.data || '{}');
      if (msg?.type === 'error') {
        console.warn('[BillgateWebView] inner error:', msg.message);
        showToast(t('profile.unitSurvey.paymentConfirmFailed'), 'error');
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Icon name="arrow-back" size={22} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t('payment.cardPayment') || '신용카드 결제'}
          {orderId ? ` · ${paymentData.ORDER_ID || orderId}` : ''}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.webviewWrap}>
        <WebView
          ref={webviewRef}
          source={{ html, baseUrl: 'https://pay.billgate.net' }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          startInLoadingState
          // 가로/세로 스크롤 + 핀치-줌 활성. BillGate certify.jsp 는 데스크탑
          // 너비여서 viewport 가 device-width 로 잠겨 있으면 안 보임.
          scrollEnabled
          showsHorizontalScrollIndicator
          showsVerticalScrollIndicator
          // Android: built-in zoom controls 활성. iOS 는 무시됨.
          setBuiltInZoomControls
          setDisplayZoomControls={false}
          // 초기 페이지(우리 HTML)와 certify.jsp 페이지 모두에 동일하게 viewport
          // 메타를 강제로 덮어쓴다. BillGate 의 자체 viewport 메타가 device-width
          // 로 잠가 두면 가로 스크롤이 동작하지 않으므로, 페이지의 모든 viewport
          // 메타를 width=auto + 최소 너비 800px 로 교체.
          injectedJavaScriptBeforeContentLoaded={injectedViewportOverride}
          injectedJavaScript={injectedViewportOverride}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={handleNavigationStateChange}
          onMessage={handleMessage}
          onError={() => {
            showToast(t('profile.unitSurvey.paymentConfirmFailed'), 'error');
          }}
        />
        {loading && (
          <View style={styles.loaderOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={COLORS.red} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  headerSpacer: { width: 36 },
  webviewWrap: { flex: 1 },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BillgateWebViewScreen;

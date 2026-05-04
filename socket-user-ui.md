# 사용자(회원) UI — Socket.IO 연동 가이드

백엔드와 동일한 이벤트 문자열을 쓰려면 `src/config/socket-events.ts`의 `SocketEvents` 상수를 참고하면 됩니다.

## 연결

| 항목 | 값 |
|------|-----|
| 엔진 경로 | `/socket.io` (Socket.IO 기본) |
| 전송 | `websocket`, `polling` |
| CORS | HTTP API와 동일한 허용 Origin (`cors.config`). 개발 환경 또는 `ALLOW_SOCKET_ANY_ORIGIN=true` 시 Origin 제한 완화 |
| 인증 | **회원 JWT**를 다음 중 하나로 전달: `handshake.auth.token`, 쿼리 `token`, 헤더 `Authorization: Bearer <jwt>` |

- 토큰이 없거나 만료/무효면 연결은 허용되나 `isAuthenticated`와 동일하지 않으며, **아래 `user:*` 이벤트는 처리되지 않습니다** (미인증 시 `error` 이벤트로 `UNAUTHORIZED` 수신).
- 유효한 회원 JWT로 연결 시 서버가 자동으로 아래 **Room**에 조인시킵니다.

### 서버가 자동 조인시키는 Room (회원만)

| Room | 용도 |
|------|------|
| `user:<userId>` | 주문/예치금 등 **개인 알림** 수신 |
| `user:<userId>:inquiries` | (예약/확장용 네이밍) |
| `user:<userId>:general-inquiries` | (예약/확장용 네이밍) |
| `notes:broadcast` | 관리자 공지(노트) 브로드캐스트 |

문의 상세 실시간 수신을 위해 클라이언트는 **`user:inquiry:subscribe`** / **`user:general-inquiry:subscribe`** 또는 생성·조회 성공 시 서버가 조인시키는 `inquiry:<id>`, `general-inquiry:<id>` Room을 사용합니다.

### 레이트 리밋

연결당 윈도우 내 최대 이벤트 수: 환경변수 `SOCKET_RATE_LIMIT_MAX_EVENTS` (기본 100), `SOCKET_RATE_LIMIT_WINDOW_MS` (기본 60000).

---

## 1. 클라이언트 → 서버 (`socket.emit`)

모든 `user:*` 이벤트는 **회원 JWT 인증 필수**.

### 1.1 주문 문의 (order-bound inquiry)

| 이벤트 | payload (요약) | 응답 이벤트 |
|--------|----------------|-------------|
| `user:inquiry:create` | `{ orderId, message?, attachments?[] }` — 본문·첨부 중 하나 필수 | `:success` / `:error` |
| `user:inquiry:send-message` | `{ inquiryId, message?, attachments?[] }` | `:success` / `:error` |
| `user:inquiry:subscribe` | `{ inquiryId }` | `user:inquiry:subscribe:success` / `:error` |
| `user:inquiry:unsubscribe` | `{ inquiryId }` | `user:inquiry:unsubscribe:success` / `:error` |
| `user:inquiry:mark-read` | `{ inquiryId }` | `user:inquiry:mark-read:success` / `:error` |
| `user:inquiry:list` | `{ status? }` | `user:inquiry:list:response` / `:error` |
| `user:inquiry:get` | `{ inquiryId }` | `user:inquiry:get:response` / `:error` |
| `user:inquiry:close` | `{ inquiryId }` | `user:inquiry:close:success` / `:error` |
| `user:inquiry:unread-count` | 없음 | `user:inquiry:unread-count:response` / `:error` |
| `user:inquiry:unread-counts` | 없음 | `user:inquiry:unread-counts:response` / `:error` |

### 1.2 일반 문의 (general inquiry)

| 이벤트 | payload (요약) | 응답 이벤트 |
|--------|----------------|-------------|
| `user:general-inquiry:create` | 서비스 스키마에 따름 (제목/카테고리/첫 메시지 등) | `:success` / `:error` |
| `user:general-inquiry:send-message` | `{ inquiryId, message?, attachments?[] }` 등 | `:success` / `:error` |
| `user:general-inquiry:subscribe` | `{ inquiryId }` | `user:general-inquiry:subscribe:success` / `:error` |
| `user:general-inquiry:unsubscribe` | `{ inquiryId }` | `user:general-inquiry:unsubscribe:success` / `:error` |
| `user:general-inquiry:mark-read` | `{ inquiryId }` | `user:general-inquiry:mark-read:success` / `:error` |
| `user:general-inquiry:list` | `{ status? }` | `user:general-inquiry:list:response` / `:error` |
| `user:general-inquiry:get` | `{ inquiryId }` | `user:general-inquiry:get:response` / `:error` |
| `user:general-inquiry:close` | `{ inquiryId }` | `user:general-inquiry:close:success` / `:error` |
| `user:general-inquiry:unread-count` | 없음 | `user:general-inquiry:unread-count:response` / `:error` |
| `user:general-inquiry:unread-counts` | 없음 | `user:general-inquiry:unread-counts:response` / `:error` |
| `user:general-inquiry:edit-message` | `{ inquiryId, messageId, message }` | `user:general-inquiry:edit-message:success` / `:error` |
| `user:general-inquiry:delete-message` | `{ inquiryId, messageId }` | `user:general-inquiry:delete-message:success` / `:error` |

에러 본문은 보통 `{ message, code }` 형태입니다.

---

## 2. 서버 → 클라이언트 (`socket.on`)

### 2.1 개인 Room `user:<userId>` (로그인 사용자)

`SocketEvents` 상수명 → 실제 이벤트 문자열:

| 이벤트 문자열 | 용도 |
|---------------|------|
| `order:status:update` | 주문 진행/창고/배송 상태 등 갱신 알림 |
| `order:item:error:notification` | 품목 오류(ERR_IN 등) — 사용자 피드백 필요 |
| `order:cross-border-shipping-cost:notification` | 국경 배송비 안내 |
| `order:cross-border-shipping-payment:status` | 국경 배송비 결제 상태 |
| `order:item:error:feedback:success` | 오류 피드백 제출 성공 |
| `deposit:charge:success` | 예치금 충전(빌게이트 등) 완료 |
| `deposit:recharge:approved` | 관리자 무통장 충전 승인 |
| `deposit:withdraw:approved` | 출금 승인 |
| `deposit:withdraw:rejected` | 출금 거절 |
| `user:inquiry:new` | 관리자가 주문 문의를 열었을 때 등 |
| `user:inquiry:message:received` | 주문 문의에 새 메시지 (REST 경로에서도 발송) |
| `user:inquiry:messages-read` | 읽음 처리 알림 |
| `user:inquiry:closed` / `user:inquiry:reopened` | 문의 종료·재오픈 |
| `user:general-inquiry:new` | 일반 문의 생성·배정 알림 |
| `user:general-inquiry:message:received` | 일반 문의 새 메시지 |
| `user:general-inquiry:messages-read` | 읽음 |
| `user:general-inquiry:closed` / `user:general-inquiry:reopened` | 종료·재오픈 |

### 2.2 Room `inquiry:<inquiryId>` (해당 문의 구독 시)

| 이벤트 | 용도 |
|--------|------|
| `inquiry:message:received` | 새 메시지 + 문의 메타 일부 |
| `inquiry:messages-read` | 읽음 영수증 |
| `inquiry:admin-assigned` | 담당 배정 |
| `inquiry:closed` / `inquiry:reopened` | 문의 상태 |

### 2.3 Room `general-inquiry:<inquiryId>`

| 이벤트 | 용도 |
|--------|------|
| `general-inquiry:message:received` | 새 메시지 |
| `general-inquiry:message:updated` | 메시지 수정·삭제 후 전체 메시지 반영 |
| `general-inquiry:messages-read` | 읽음 |
| `general-inquiry:admin-assigned` | 담당 배정 |
| `general-inquiry:closed` / `general-inquiry:reopened` | 종료·재오픈 |

### 2.4 Room `notes:broadcast` (회원 소켓 자동 조인)

| 이벤트 | 용도 |
|--------|------|
| `note:broadcast` | 관리자 노트 생성/수정 등 브로드캐스트 |
| `note:deleted` | 노트 삭제 |

### 2.5 공개 (로그인 불필요, 전체 `io.emit`)

| 이벤트 | 용도 |
|--------|------|
| `exchange-rate:updated` | 환율(예: CNY) 변경 — 상품 가격 UI 갱신용 |

비로그인 연결도 이 이벤트는 받을 수 있습니다.

---

## 3. 공통 에러

| 이벤트 | 설명 |
|--------|------|
| `error` | 인증 실패(`UNAUTHORIZED`), 기타 표준 에러 객체 `{ message, code, ... }` |
| Socket.IO `connect_error` | CORS 거부 등 핸드셰이크 실패 |

서버 내부 연결 오류 시 `error` 이벤트로 `SocketEvents.ERROR` 페이로드가 나갈 수 있습니다 (`createSocketError` 형식).

---

## 4. 관리자 전용 (사용자 UI에서 제외)

아래는 **사용자 앱에서 구독할 필요 없음**: `admin:*`, `order:new`, `order:update`(관리자 `orders` Room 위주), `order:status-counts`, `admin:rack:update`, `admin:deposit-request:*`, `admin:pending-counts:*` 등.

주문 실시간 목록이 사용자 앱에 필요하면 별도 요구사항 확인 (현재 구현은 관리자 위주 브로드캐스트).

---

## 5. 프론트엔드 체크리스트

1. API Base URL과 동일 호스트에 `path: '/socket.io'`로 연결.
2. 로그인 후 `auth: { token: accessToken }` 또는 동등한 방식으로 JWT 전달.
3. `user:<ownUserId>` 대상 이벤트는 Room을 직접 join 할 필요 없음 (서버 자동).
4. 문의 채팅 화면: 해당 `inquiryId` / `generalInquiryId`에 대해 `subscribe` 후 Room 이벤트 + 필요 시 `user:*:message:received` 중복 수신 여부를 UI 정책에 맞게 처리.
5. 환율 노출 화면: 비로그인이라도 `exchange-rate:updated` 구독 가능.

# 사용자 인증 및 AI 연동 계획

애플리케이션을 로컬 목업 단계에서 벗어나, 사용자 가입 및 실제 AI와 상호작용이 가능한 실질적인 웹 서비스로 전환합니다.

## 제안된 변경 사항

### [인증 및 사용자 관리]

#### [신규] [AuthView.tsx](file:///c:/Users/최동준/Desktop/lifesync-ai/views/AuthView.tsx)
- 아름답고 미니멀한 로그인/회원가입 페이지 구현.
- 필드: 이메일(또는 사용자명), 비밀번호, Gemini API 키(가입 시 선택 입력).
- 로그인 모드와 가입 모드 간의 부드러운 전환 효과.

#### [수정] [App.tsx](file:///c:/Users/최동준/Desktop/lifesync-ai/App.tsx)
- `isAuthenticated` 및 `currentUser` 상태 추가.
- 인증 게이트 구현: 미인증 상태일 경우 `AuthView` 표시.
- 인증 정보를 통해 사용자 데이터(API 키, 이름 등)를 앱 상태와 동기화.

### [AI 연동 고도화]

#### [신규] [gemini.ts](file:///c:/Users/최동준/Desktop/lifesync-ai/utils/gemini.ts)
- `fetch`를 사용한 Google Gemini API 래퍼 구현.
- 사용자 활동을 바탕으로 댓글 및 게시글을 생성하는 함수.

#### [수정] [triggerEngine.ts](file:///c:/Users/최동준/Desktop/lifesync-ai/utils/triggerEngine.ts)
- `generateCommunityPosts`가 유효한 API 키가 있을 경우 실제 Gemini API를 호출하도록 수정.
- API 키가 없거나 호출에 실패할 경우 기존의 목업 템플릿으로 우아하게 대체(Fallback).

## 검증 계획

### 자동화 테스트
- 해당 없음 (수동 시각 및 기능 점검)

### 수동 검증
1. 앱 실행 -> 인증 페이지(`AuthView`) 노출 확인.
2. 회원가입 완료 -> 메인 대시보드 진입 확인.
3. 설정에서 Gemini API 키 입력 (가입 시 입력하지 않은 경우).
4. 메모 작성 -> API 키가 유효할 때 AI 페르소나가 실시간으로 생성된 댓글을 다는지 확인.
5. 로그아웃 및 새로고침 -> 인증 상태 및 데이터 유지 확인.

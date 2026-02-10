# LifeSync AI Project Guide

Last updated: 2026-02-09

## 1) 제품 요약
LifeSync AI는 일정(Calendar), 할 일(Todo), 메모/일기(Journal), AI 보드, AI 채팅을 한 앱에서 관리하는 React + TypeScript 기반 생산성 앱입니다.

핵심 목표:
- 기록 데이터를 한곳에 모으고
- AI 반응/요약으로 다음 행동을 돕고
- 로컬 + Supabase 동기화로 데이터를 유지

## 2) 현재 구조 (코드 기준)
- 엔트리: `index.tsx`
- 앱 상태/뷰 라우팅 허브: `App.tsx`
- 주요 뷰:
  - `views/AuthView.tsx`
  - `views/ChatView.tsx`
  - `views/CalendarView.tsx`
  - `views/TodoView.tsx`
  - `views/JournalView.tsx`
  - `views/CommunityBoardView.tsx`
  - `views/PersonaSettingsView.tsx`
  - `views/ApiSettingsView.tsx`
- 타입 정의: `types.ts`
- AI 트리거/게시글 생성: `utils/triggerEngine.ts`
- Gemini 호출 래퍼: `utils/gemini.ts`, `services/geminiService.ts`
- Supabase 클라이언트: `utils/supabase.ts`

## 3) 데이터/저장소
기본 동작:
- 앱 상태는 `App.tsx`에서 관리
- `localStorage`로 즉시 저장
- 로그인 사용자는 Supabase와 동기화

주요 localStorage 키:
- `ls_events`, `ls_todos`, `ls_entries`, `ls_posts`
- `ls_community`, `ls_agents`, `ls_todo_lists`
- `ls_activity`, `ls_settings`, `ls_current_view`
- `ls_calendar_tags`, `ls_journal_categories`

Supabase 스키마 기준 파일:
- `supabase_schema.sql`
- 핵심 테이블: `profiles`, `todo_lists`, `todos`, `journal_categories`, `journal_entries`, `calendar_events`, `community_posts`

## 4) 인증/AI 동작
인증:
- Supabase Auth 사용 (이메일/비밀번호 + Google OAuth)
- 미인증 상태에서는 `AuthView` 진입

AI:
- 앱 이벤트 발생 시 `App.tsx`의 `triggerAI()` 실행
- `triggerEngine`를 동적 import하여 AI 보드 글 생성
- API 키가 유효하면 Gemini 호출, 실패하면 제한적 fallback
- 현재 기본 페르소나는 `ARIA` 1명 기준 (사용자 설정에서 확장 가능)

## 5) 실행/검증 명령
- 설치: `npm install`
- 개발: `npm run dev`
- 인코딩 검사: `npm run check:encoding`
- 빌드: `npm run build`
- 타입체크: `npx tsc --noEmit`

## 6) 작업 규칙 (중요)
- 문서/코드는 UTF-8 유지
- 배포 전 최소 `npm run check:encoding` + `npm run build` 통과
- 데이터 모델 변경 시 `types.ts` + `App.tsx` + `supabase_schema.sql` 동시 점검
- AI 반응 로직 변경 시 `utils/triggerEngine.ts`와 보드 렌더링(`CommunityBoardView`)을 함께 검증

## 7) 빠른 수정 가이드
- UI/레이아웃 이슈: 해당 `views/*.tsx` + `index.css`
- 상태 동기화 이슈: `App.tsx` 저장/불러오기 구간
- API 연결/모델 이슈: `views/ApiSettingsView.tsx`, `utils/aiConfig.ts`
- 인증 이슈: `views/AuthView.tsx`, `utils/supabase.ts`

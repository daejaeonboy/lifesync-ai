const MOJIBAKE_MAP: Array<[string, string]> = [
  ['?쇱젙', '일정'],
  ['?앹씪', '생일'],
  ['濡쒓렇', '로그'],
  ['寃뚯떆湲', '게시글'],
  ['?섎Ⅴ?뚮굹', '페르소나'],
  ['移댄뀒怨좊━', '카테고리'],
  ['紐⑸줉', '목록'],
  ['湲곕줉', '기록'],
  ['?쇨린', '일기'],
  ['?대쫫', '이름'],
  ['?ㅽ뻾', '실행'],
  ['異붽?', '추가'],
  ['痍⑥냼', '취소'],
  ['?섏젙', '수정'],
  ['蹂듭썝', '복원'],
  ['??젣', '삭제'],
  ['?꾨즺', '완료'],
  ['硫붾え', '메모'],
  ['醫뗭쓬', '좋음'],
  ['?섏겏', '나쁨'],
  ['蹂댄넻', '보통'],
];

export const normalizeKoreanText = (value?: string | null): string => {
  if (typeof value !== 'string' || value.length === 0) return value ?? '';

  let normalized = value;
  for (const [broken, fixed] of MOJIBAKE_MAP) {
    if (normalized.includes(broken)) {
      normalized = normalized.split(broken).join(fixed);
    }
  }
  return normalized;
};

// 장면 ID → { file, start, end } — public/video/ 기준, 초 단위
// 영상 클립 하나당 한 장면(대사) 원칙.
// 대사와 의미가 확실히 맞는 문서화된 영상만 연결하고, 애매한 장면은 텍스트 전용으로 둔다.
export const SCENE_VIDEOS = {

  /* ── 유아기 ─────────────────────────────────────────────────── */
  opening:        { file: '유아기- 탄생.mp4',   start: 0, end: 7  }, // 요람, 모빌, 부모 얼굴
  infancy_milk:   { file: '유아기-분유먹음.mp4', start: 0, end: 3  }, // 젖병 먹이기
  infancy_steps:  { file: '유아기-걸음마.mp4',  start: 0, end: 3  }, // 첫 걸음마
  infancy_doodle: { file: '유아기-낙서.mp4',    start: 0, end: 3  }, // 소파 위 낙서
  doljabi_choice: { file: '유아기-돌잔치.mp4',  start: 0, end: 5  }, // 돌잡이 선택

  /* ── 유년기 ─────────────────────────────────────────────────── */
  childhood_bike:        { file: '유년기- 자전거 타기.mp4',    start: 0, end: 5 }, // 보조바퀴 자전거
  childhood_kinder:      { file: '유년기- 유치원 등원.mp4',     start: 0, end: 3 }, // 유치원 등원
  childhood_school:      { file: '유년기- 초등학교 입학식.mp4', start: 0, end: 3 }, // 입학식 강당
  childhood_dictation:   { file: '유년기- 받아쓰기 시험.mp4',   start: 0, end: 5 }, // 받아쓰기
  childhood_run:         { file: '유년기- 달리기.mp4',          start: 0, end: 4 }, // 달리기 출발
  childhood_fall_choice: { file: '유년기- 달리기.mp4',          start: 4, end: 8 }, // 넘어진 직후 선택
  childhood_fall_up:     { file: '달리기 일어나기.mp4',         start: 0, end: 8 }, // 일어나 다시 뛰기

  /* ── 청소년기 ───────────────────────────────────────────────── */
  teen_uniform:        { file: '청소년기-교복맞추러옴.mp4',     start: 0, end: 2 }, // 교복 맞추기
  teen_class:          { file: '청소년기- 학교에서 공부함.mp4', start: 0, end: 4 }, // 수업/시험지
  teen_home:           { file: '청소년기- 친구랑 걷기.mp4',     start: 0, end: 3 }, // 하교 친구들
  teen_confess_choice: { file: '청소년기- 고백받기.mp4',        start: 0, end: 4 }, // 고백 받음 → 선택

  /* ── 사귄다 경로 ────────────────────────────────────────────── */
  date_1: { file: '사귄다-손잡고걷기.mp4',                      start: 0, end: 4 }, // 손 잡고 걷기
  date_2: { file: '사귄다-꽃 다발 선물하기.mp4',                start: 0, end: 2 }, // 꽃다발 선물
  date_3: { file: '사귄다- 편지지 받기.mp4',                    start: 0, end: 3 }, // 손편지 받기
  date_4: { file: '사귄다-사귀는거 걸림.mp4',                   start: 0, end: 2 }, // 부모에게 들킴
  date_5: { file: '사귄다- 헤어지자 문자.mp4',                  start: 0, end: 7 }, // 이별 카톡
  date_6: { file: '안사귄다,사귄다 공통- 친구에게 온 전화 받기.mp4', start: 0, end: 4 }, // 친구 전화
  date_7: { file: '담배 권유 YES- 밤에 나가는.mp4',              start: 0, end: 5 }, // 친구 만나러 나감

  /* ── 안사귄다 경로 ──────────────────────────────────────────── */
  single_1: { file: '안사귄다- 걸어서 집 가기.mp4',                  start: 0, end: 3 }, // 혼자 귀가
  // single_2, single_3: 전용 영상 없음 → 텍스트 전용

  /* ── 담배 권유 선택 ─────────────────────────────────────────── */
  smoke_choice: { file: '안사귄다,사귄다 공통-담배권유받기.mp4', start: 0, end: 3 }, // 해질녘 골목 담배 권유

  /* ── 담배 YES 경로 ──────────────────────────────────────────── */
  dev_1:              { file: '담배 권유 YES- 담배피는.mp4',           start: 0, end: 4  }, // 첫 담배
  dev_2:              { file: '담배 권유 YES- 밤에 술마시기.mp4',       start: 0, end: 6  }, // 친구들과 술
  dev_3:              { file: '담배 권유 YES- 엄마, 담임 연락씹기.mp4', start: 0, end: 11 }, // 연락 무시
  dev_4:              { file: '담배 권유 YES- 담배걸림.mp4',            start: 0, end: 3  }, // 담배 들킴
  dev_counsel_choice: { file: '담배 권유 YES- 부모님께 혼남.mp4',       start: 0, end: 2  }, // 가족 상담 → 선택

  /* ── 교도소 엔딩 ────────────────────────────────────────────── */
  prison_scene: { file: '교도소 엔딩.mp4', start: 0, end: 8 },

  /* ── 담배 NO / 수험·대학 경로 ──────────────────────────────── */
  study_1:       { file: '담배 권유 NO- 모의고사공부.mp4',   start: 0,    end: 2.15 }, // 공부
  study_2:       { file: '담배 권유 NO- 모의고사공부.mp4',   start: 2.15, end: 4.33 }, // 모의고사 공부 이어감
  study_3:       { file: '담배 권유 NO- 정시상담.mp4',       start: 0, end: 2  }, // 정시 상담
  study_4:       { file: '담배 권유 NO- 수능.mp4',           start: 0,    end: 2    }, // 수능 시험
  study_5:       { file: '담배 권유 NO- 수능.mp4',           start: 0.74, end: 2.74 }, // 수능 마무리
  study_6:       { file: '담배 권유 NO- 합격자발표.mp4',     start: 0, end: 10 }, // 합격 확인
  study_7:       { file: '담배 권유 NO-1월1일.mp4',          start: 0, end: 3  }, // 합격 건배
  study_8:       { file: '담배 권유 NO-입학식.mp4',          start: 0, end: 2  }, // 대학 입학식
  study_9:       { file: '담배 권유 NO- 밤샘팀플.mp4',       start: 0, end: 9  }, // 밤샘 팀플
  study_10:      { file: '담배 권유 NO- 밤샘팀플.mp4',       start: 9, end: 18 }, // 팀플 이후 피로
  study_11:      { file: '담배 권유 NO- 창업포스터발견.mp4', start: 0, end: 5  }, // 창업 포스터 발견
  career_choice: { file: '담배 권유 NO- 부모님설득.mp4',     start: 0, end: 2  }, // 진로 갈등 → 선택

  /* ── 창업 경로 ──────────────────────────────────────────────── */
  startup_1:       { file: '창업 준비장면.mp4',   start: 0, end: 9 }, // 창업 준비 회의
  startup_success: { file: '투자설명회 성공.mp4', start: 0, end: 7 }, // 투자 성공
  // startup_fail: 전용 영상 없음 → 텍스트 전용

  /* ── 취업 경로 ──────────────────────────────────────────────── */
  job_1: { file: '회사( 부모님이 원하는)-취준공부.mp4', start: 0, end: 3 }, // 취업 준비
  job_2: { file: '회사( 부모님이 원하는)-면접1.mp4',   start: 0, end: 3 }, // 첫 면접
  job_3: { file: '회사( 부모님이 원하는)-혼술.mp4',    start: 0, end: 2 }, // 면접 후 혼술
  job_4: { file: '회사( 부모님이 원하는)-면접2.mp4',   start: 0, end: 2 }, // 재면접
  job_5: { file: '회사( 부모님이 원하는)-합격.mp4',    start: 0, end: 2 }, // 합격
  job_6: { file: '회사( 부모님이 원하는)- 입사.mp4',   start: 0, end: 9 }, // 입사 인사
  job_7: { file: '회사( 부모님이 원하는)-야근.mp4',    start: 0, end: 9 }, // 반복 야근

  /* ── 중장년기 관계 선택 ─────────────────────────────────────── */
  blinddate_choice: { file: '소개팅vs첫사랑.mp4',   start: 0, end: 10 }, // 소개팅/첫사랑 전화 → 선택

  /* ── 소개팅(만남) 경로 ──────────────────────────────────────── */
  marry_arranged_1: { file: '소개팅.MOV',          start: 0, end: 7 }, // 소개팅 연락
  marry_arranged_2: { file: '첫사랑-결혼식.mp4',   start: 0, end: 2 }, // 성대한 결혼식

  /* ── 첫사랑 경로 ────────────────────────────────────────────── */
  marry_love_1: { file: '첫사랑.MOV',           start: 0, end: 6 }, // 첫사랑에게 전화
  marry_love_2: { file: '첫사랑- 신혼생활.mp4', start: 0, end: 2 }, // 신혼 생활

  /* ── 비혼 경로 ──────────────────────────────────────────────── */
  // single_funeral_choice: 매칭 영상 없음 → 텍스트 전용 장면
  funeral_go:            { file: '노년기- 결혼안함 모임나감(친구들 사이에서죽음).mp4', start: 0, end: 4 }, // 친구들과 식사
  funeral_death:         { file: '노년기- 결혼안함 모임나감(친구들 사이에서죽음).mp4', start: 4, end: 8 }, // 친구들 곁 임종
  lonely_death:          { file: '노년기- 고독사.mp4',                             start: 0, end: 7 }, // 혼자 임종

  /* ── 노년기 / 엔딩 ──────────────────────────────────────────── */
  elder_common:      { file: '노년기- 담배 끊을껀지 안끊을껀지.mp4',         start: 0, end: 4 }, // 병원/노년
  ending_common:     { file: '노년기- 결혼했을때 담배 끊었을 때 결말.mp4',   start: 0, end: 9 }, // 가족과 함께 임종
  ending_unfinished: { file: '노년기- 담배 안 끊을 때 결말.mp4',             start: 0, end: 6 }, // 어둠 속 임종
};

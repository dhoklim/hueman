// 장면 ID → { file, start, end } — public/video/ 기준, 초 단위
// 영상 설명(영상_장면_설명.txt) 타임코드를 참고해 각 장면에 맞는 구간 지정
export const SCENE_VIDEOS = {

  /* ── 유아기.mp4 (21s) ──────────────────────────────────────── */
  opening:        { file: 'infancy.mp4', start: 0,  end: 5  }, // 요람, 모빌, 부모 얼굴
  infancy_milk:   { file: 'infancy.mp4', start: 5,  end: 8  }, // 젖병 먹이기
  infancy_steps:  { file: 'infancy.mp4', start: 8,  end: 11 }, // 손 잡아주기/걸음마
  infancy_doodle: { file: 'infancy.mp4', start: 11, end: 14 }, // 소파 위 낙서
  doljabi_choice: { file: 'infancy.mp4', start: 14, end: 21 }, // 돌잡이 가족 둘러앉음

  /* ── 유년기.mp4 (24s) ──────────────────────────────────────── */
  childhood_bike:        { file: 'childhood.mp4', start: 0,  end: 5  }, // 보조바퀴 자전거
  childhood_kinder:      { file: 'childhood.mp4', start: 5,  end: 8  }, // 유치원 등원
  childhood_school:      { file: 'childhood.mp4', start: 8,  end: 11 }, // 입학식 강당
  childhood_dictation:   { file: 'childhood.mp4', start: 11, end: 16 }, // 교실에서 쓰기
  childhood_run:         { file: 'childhood.mp4', start: 16, end: 19 }, // 달리기 출발
  childhood_fall_choice: { file: 'childhood.mp4', start: 19, end: 24 }, // 넘어짐 → 선택
  childhood_fall_up:     { file: 'run-rise.mp4',  start: 0,  end: 8  }, // 일어나 다시 뛰기
  childhood_fall_quit:   { file: 'childhood.mp4', start: 19, end: 24 }, // 주저앉음

  /* ── 청소년기.mp4 (16s) ─────────────────────────────────────── */
  teen_uniform:        { file: 'teen.mp4', start: 0,  end: 4  }, // 교복 맞추기
  teen_class:          { file: 'teen.mp4', start: 4,  end: 10 }, // 수업/시험지
  teen_home:           { file: 'teen.mp4', start: 10, end: 12 }, // 복도/하교
  teen_confess_choice: { file: 'teen.mp4', start: 12, end: 16 }, // 쪽지 건네는 고백

  /* ── 사귄다.mp4 (25s) ──────────────────────────────────────── */
  date_1: { file: 'date.mp4', start: 3,  end: 7  }, // 손잡고 걷기
  date_2: { file: 'date.mp4', start: 7,  end: 9  }, // 꽃다발
  date_3: { file: 'date.mp4', start: 9,  end: 11 }, // 부모 갈등 시작
  date_4: { file: 'date.mp4', start: 9,  end: 11 }, // 엄마에게 혼남
  date_5: { file: 'date.mp4', start: 11, end: 18 }, // 이별 카톡("우리 헤어지자")
  date_6: { file: 'date.mp4', start: 18, end: 22 }, // 공부 중 전화
  date_7: { file: 'date.mp4', start: 22, end: 25 }, // 해질녘 골목

  /* ── 안사귄다.mp4 (10s) ─────────────────────────────────────── */
  single_1: { file: 'no-date.mp4', start: 0, end: 3  }, // 혼자 걷기
  single_2: { file: 'no-date.mp4', start: 3, end: 7  }, // 공부 + 전화
  single_3: { file: 'no-date.mp4', start: 7, end: 10 }, // 해질녘 친구들 만나러

  /* ── 담배 권유 YES.mp4 (30s) ────────────────────────────────── */
  dev_1:              { file: 'smoke-yes.mp4', start: 0,  end: 9  }, // 담배 점화 → 야외 이동
  dev_2:              { file: 'smoke-yes.mp4', start: 9,  end: 14 }, // 친구들과 술
  dev_3:              { file: 'smoke-yes.mp4', start: 16, end: 25 }, // 연락 무시
  dev_4:              { file: 'smoke-yes.mp4', start: 25, end: 29 }, // 집에서 담배 걸림
  dev_counsel_choice: { file: 'smoke-yes.mp4', start: 25, end: 30 }, // 가족 상담 → 선택

  /* ── 교도소 엔딩.mp4 (8s) ───────────────────────────────────── */
  prison_scene: { file: 'prison.mp4', start: 0, end: 8 },

  /* ── 담배 권유 NO.mp4 (46s) ─────────────────────────────────── */
  study_1:       { file: 'smoke-no.mp4', start: 0,  end: 4  }, // 공부
  study_2:       { file: 'smoke-no.mp4', start: 4,  end: 7  }, // 시험
  study_3:       { file: 'smoke-no.mp4', start: 7,  end: 10 }, // 상담/접수
  study_4:       { file: 'smoke-no.mp4', start: 10, end: 17 }, // 합격 확인
  study_5:       { file: 'smoke-no.mp4', start: 17, end: 20 }, // 부모와 포옹/축하
  study_6:       { file: 'smoke-no.mp4', start: 17, end: 20 }, // 합격 확인
  study_7:       { file: 'smoke-no.mp4', start: 17, end: 22 }, // 건배
  study_8:       { file: 'smoke-no.mp4', start: 20, end: 22 }, // 입학식/행사장
  study_9:       { file: 'smoke-no.mp4', start: 22, end: 27 }, // 야간 과제/회의
  study_10:      { file: 'smoke-no.mp4', start: 27, end: 39 }, // 창가 일상
  study_11:      { file: 'smoke-no.mp4', start: 39, end: 45 }, // 창업 포스터 발견
  career_choice: { file: 'smoke-no.mp4', start: 39, end: 46 }, // 부모와 마주 앉음 → 선택

  // 취업 경로 — smoke-no.mp4 구간 재활용
  job_1: { file: 'smoke-no.mp4', start: 0,  end: 4  }, // 취업 준비
  job_2: { file: 'smoke-no.mp4', start: 4,  end: 7  }, // 첫 면접
  job_3: { file: 'smoke-no.mp4', start: 17, end: 20 }, // 면접 끝의 술 한 잔
  job_4: { file: 'smoke-no.mp4', start: 4,  end: 7  }, // 또 다른 면접
  job_5: { file: 'smoke-no.mp4', start: 7,  end: 17 }, // 합격 메시지 확인
  job_6: { file: 'smoke-no.mp4', start: 20, end: 22 }, // 입사 인사/새 명함
  job_7: { file: 'smoke-no.mp4', start: 27, end: 39 }, // 반복되는 근무

  /* ── 창업 장면 ──────────────────────────────────────────────── */
  startup_1:       { file: 'startup.mp4',         start: 0, end: 9 },
  startup_success: { file: 'startup-success.mp4', start: 0, end: 7 },
};

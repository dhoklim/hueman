import { EMOTIONS } from './emotionColor.js';
import { messageFor } from './comfortMessages.js';

// 체험 이벤트 형식: { sceneId, emotion, source: 'scene'|'webcam', durationMs, timestamp }
// 지금은 source='scene' 만. System B 가 같은 형식으로 'webcam' 이벤트를 추가한다.
export function createLog() {
  return { events: [] };
}

export function record(log, event) {
  log.events.push(event);
  return log;
}

const COMPOSITE_THRESHOLD = 0.2; // 1·2위 차가 1위의 20% 미만이면 복합 감정

export function aggregate(log) {
  const totals = {};
  for (const e of log.events) {
    const info = EMOTIONS[e.emotion];
    if (!info || !info.aggregate) continue; // 놀람/미지 감정 제외
    totals[info.category] = (totals[info.category] || 0) + (e.durationMs || 0);
  }

  const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) {
    return { topCategory: 'numb', secondCategory: null, isComposite: false, message: messageFor('numb'), totals };
  }

  const [topCategory, topVal] = ranked[0];
  const second = ranked[1] || null;
  const isComposite = !!second && (topVal - second[1]) / topVal < COMPOSITE_THRESHOLD;
  const category = isComposite ? 'composite' : topCategory;

  return {
    topCategory,
    secondCategory: second ? second[0] : null,
    isComposite,
    message: messageFor(category),
    totals,
  };
}

export function emotionTimeline(log) {
  const total = log.events.reduce((sum, e) => {
    const info = EMOTIONS[e.emotion];
    return info && info.aggregate ? sum + (e.durationMs || 0) : sum;
  }, 0);

  if (total <= 0) return [];

  return log.events
    .map((e) => {
      const info = EMOTIONS[e.emotion];
      if (!info || !info.aggregate) return null;
      const durationMs = e.durationMs || 0;
      return {
        sceneId: e.sceneId,
        emotion: e.emotion,
        category: info.category,
        durationMs,
        percent: Math.round((durationMs / total) * 100),
      };
    })
    .filter(Boolean);
}

// 감정을 "느낀 순서대로" 보여주는 타임라인.
// emotionTimeline(시간순, 비집계 감정 제외)을 받아 연속된 같은 감정을 한 구간으로 병합한다.
// 결과 화면에서 빈도순 정렬이 아니라 실제 감정 흐름(시간순)으로 그리기 위함.
export function emotionRuns(log) {
  const events = emotionTimeline(log);
  const total = events.reduce((sum, e) => sum + e.durationMs, 0);
  if (total <= 0) return [];

  const runs = [];
  for (const e of events) {
    const last = runs[runs.length - 1];
    if (last && last.category === e.category) {
      last.durationMs += e.durationMs;
    } else {
      runs.push({ category: e.category, durationMs: e.durationMs });
    }
  }
  return runs.map((r) => ({ ...r, percent: Math.round((r.durationMs / total) * 100) }));
}

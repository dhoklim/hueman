// 제안서 6장 위로 메시지 풀. 집계 카테고리 = 기쁨/슬픔/불안/분노/무감각 + 복합.
export const COMFORT_MESSAGES = {
  joy:       '그 빛나는 순간들이 진짜였다. 당신은 충분히 행복할 자격이 있다.',
  sad:       '많이 울었던 만큼, 많이 사랑했던 거다. 그 눈물은 약함이 아니었다.',
  anxiety:   '두려워하면서도 계속 나아갔다. 그것만으로도 충분히 용감했다.',
  anger:     '화가 났다는 건 포기하지 않았다는 뜻이다. 그 열기가 당신을 여기까지 데려왔다.',
  numb:      '아무것도 느끼지 못하는 것도, 느끼는 것이다. 당신은 충분히 지쳐 있었다.',
  composite: '그 뒤섞인 마음들이 모두 당신이다. 복잡해도 괜찮다. 인생이 원래 그렇다.',
};

export const CATEGORY_LABELS = {
  joy: '기쁨', sad: '슬픔', anxiety: '불안', anger: '분노', numb: '무감각', composite: '복합 감정',
};

export function messageFor(category) {
  return COMFORT_MESSAGES[category] || COMFORT_MESSAGES.composite;
}

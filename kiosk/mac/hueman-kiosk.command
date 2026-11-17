#!/bin/bash
# hueman 전시용 실행기 (macOS). 더블클릭하면 크롬이 주소창·탭 없이 전체화면으로 hueman만 띄운다.
# - 전시 전용 크롬 프로필(~/hueman-kiosk-profile)을 써서 평소 크롬의 로그인·기록·북마크가 보이지 않는다.
# - 크롬이 켜져 있는 동안 맥이 잠들거나 화면이 꺼지지 않게 한다(caffeinate).
# - 트랙패드 두 손가락 스와이프로 뒤로 가기·핀치 확대가 되지 않게 한다.
# 실행 뒤 남는 터미널 창은 닫아도 된다. 끝내기: Cmd+Q.

URL="https://dhoklim.github.io/hueman/"
APP="/Applications/Google Chrome.app"
PROFILE_DIR="$HOME/hueman-kiosk-profile"

if [ ! -d "$APP" ]; then
  osascript -e 'display alert "Google Chrome이 없습니다" message "응용 프로그램 폴더에 Google Chrome을 설치한 뒤 다시 실행해 주세요."'
  exit 1
fi

# open 으로 띄워 터미널과 분리한다 → 터미널 창을 닫아도 크롬은 계속 켜져 있다.
open -na "$APP" --args \
  --kiosk "$URL" \
  --user-data-dir="$PROFILE_DIR" \
  --no-first-run \
  --no-default-browser-check \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --disable-features=Translate

# 크롬 본체 프로세스를 찾아, 그 크롬이 떠 있는 동안만 잠자기·화면 꺼짐을 막는다.
CHROME_PID=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
  sleep 1
  CHROME_PID="$(pgrep -o -f "user-data-dir=$PROFILE_DIR")"
  [ -n "$CHROME_PID" ] && break
done

if [ -n "$CHROME_PID" ]; then
  nohup caffeinate -dims -w "$CHROME_PID" >/dev/null 2>&1 &
else
  # 크롬 프로세스를 못 찾으면 12시간 동안만 잠자기를 막는다.
  nohup caffeinate -dims -t 43200 >/dev/null 2>&1 &
fi

echo "hueman 전시 화면을 띄웠습니다. 이 터미널 창은 닫아도 됩니다."
exit 0

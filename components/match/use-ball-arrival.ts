"use client";

// 공이 골문에 닿는 순간을 알려주는 훅.
//
// 왜 필요한가: 장면이 시작되면 자막("...의 골!")과 골 플래시가 즉시 떴는데, 공 안무는
// 2.0초에 걸쳐 진행돼 실제로 골망을 흔드는 건 2초 뒤였다. 그래서 "골이라고 써 놓고
// 공은 아직 중원에 있는" 상태가 2초간 지속됐다. 중계에서 가장 어색한 어긋남이다.
//
// 해결: 안무의 공 경로 길이(dur)만큼 기다렸다가 "도착" 신호를 준다. 자막의 골 문구와
// 플래시는 이 신호에 맞춰 터진다. 그 전까지는 빌드업(찬스 -> 슛)까지만 보여준다.

import { useEffect, useState } from "react";

/**
 * @param sceneKey 장면 식별자. 바뀌면 도착 상태가 초기화된다.
 * @param delayMs  공이 목표 지점에 닿기까지 걸리는 시간(ms). 0 이하면 즉시 도착으로 본다.
 * @param enabled  이 장면이 도착 타이밍을 쓰는가(골 장면에서만 true).
 */
export function useBallArrival(sceneKey: string | null, delayMs: number, enabled: boolean): boolean {
  // "도착했다"를 불리언으로 들고 장면이 바뀔 때마다 false로 되돌리면 이펙트 본문에서
  // 동기적으로 setState하게 된다(react-hooks/set-state-in-effect 위반). 대신 "어느
  // 장면이 도착했는지"를 키로 들고, 현재 장면과 같은지 렌더 중에 파생시킨다.
  // 장면이 바뀌면 키가 자동으로 어긋나므로 별도 리셋이 필요 없다.
  const [arrivedKey, setArrivedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !sceneKey) return;
    // delayMs가 0이어도 setTimeout은 다음 틱으로 미루므로 별도 분기가 필요 없다.
    const id = setTimeout(() => setArrivedKey(sceneKey), Math.max(0, delayMs));
    return () => clearTimeout(id);
  }, [sceneKey, delayMs, enabled]);

  return enabled && sceneKey !== null && arrivedKey === sceneKey;
}

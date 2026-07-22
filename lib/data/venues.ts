import type { Venue } from "@/lib/types";

export const VENUES: Venue[] = [
  { id: "azteca", nameKo: "아스테카 경기장", cityKo: "멕시코시티", altitude: 2240, avgTempC: 24, dome: false, capacity: 87523 },
  { id: "monterrey", nameKo: "몬테레이 경기장", cityKo: "몬테레이", altitude: 540, avgTempC: 33, dome: false, capacity: 53500 },
  { id: "dallas", nameKo: "댈러스 경기장", cityKo: "댈러스", altitude: 190, avgTempC: 35, dome: true, capacity: 80000 },
  { id: "miami", nameKo: "마이애미 경기장", cityKo: "마이애미", altitude: 2, avgTempC: 32, dome: false, capacity: 65326 },
  { id: "metlife", nameKo: "메트라이프 경기장", cityKo: "뉴저지", altitude: 7, avgTempC: 27, dome: false, capacity: 82500 },
  { id: "sofi", nameKo: "소파이 경기장", cityKo: "로스앤젤레스", altitude: 30, avgTempC: 24, dome: true, capacity: 70000 },
  { id: "seattle", nameKo: "시애틀 경기장", cityKo: "시애틀", altitude: 50, avgTempC: 22, dome: false, capacity: 68740 },
  { id: "atlanta", nameKo: "애틀랜타 경기장", cityKo: "애틀랜타", altitude: 320, avgTempC: 31, dome: true, capacity: 71000 },
];

// 런타임 등록 레지스트리(예: WC2026 로더). venueById는 이 레지스트리를 먼저
// 확인하고, 없으면 기존 VENUES 배열로 폴백한다. 기존 경기장 조회 동작은
// 변경되지 않는다.
const extraVenues: Record<string, Venue> = {};

export function registerVenue(venue: Venue): void {
  extraVenues[venue.id] = venue;
}

export function venueById(id: string): Venue | undefined {
  return extraVenues[id] ?? VENUES.find((v) => v.id === id);
}

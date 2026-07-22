export type Position = "GK" | "CB" | "FB" | "DM" | "CM" | "AM" | "WG" | "ST";
export type FormationId = "4-3-3" | "4-4-2" | "4-2-3-1" | "3-5-2" | "3-4-3" | "5-4-1";
export type RoleId =
  | "gk_sweeper" | "gk_traditional"
  | "cb_stopper" | "cb_cover"
  | "fb_overlap" | "fb_defensive"
  | "dm_anchor" | "dm_regista"
  | "cm_b2b" | "cm_deeplying" | "cm_holding"
  | "am_playmaker" | "am_shadow"
  | "wg_inverted" | "wg_classic"
  | "st_target" | "st_false9" | "st_poacher";

export interface PlayerAttrs {
  shooting: number; passing: number; dribbling: number; defending: number;
  pace: number; physical: number; goalkeeping: number; stamina: number;
} // 전부 정수 1~99

export interface Player {
  id: string; teamId: string; name: string; age: number; caps: number;
  positions: Position[];            // [0]이 주포지션
  attrs: PlayerAttrs;
  setPiece: number; aerial: number; penalty: number; mental: number; // 1~99
}

export interface Team {
  id: string; nameKo: string; code: string;     // code: "KOR" 등 3글자
  elo: number; fifaRank: number; form: number;   // form 1~10
  styleTags: string[]; color1: string; color2: string; // hex
}

export interface Venue {
  id: string; nameKo: string; cityKo: string;
  altitude: number; avgTempC: number; dome: boolean; capacity: number;
}

export interface HeadToHead { teamA: string; teamB: string; winA: number; draw: number; winB: number; }

export interface FormationSlot { id: string; position: Position; x: number; y: number; } // x,y: 0~100 (자기 진영 기준, y=0 골라인)
export interface Formation { id: FormationId; nameKo: string; slots: FormationSlot[]; } // slots.length === 11

export interface TeamInstructions {
  formation: FormationId;
  pressing: 1 | 2 | 3; line: 1 | 2 | 3; attacking: 1 | 2 | 3; tempo: 1 | 2 | 3;
  buildup: "short" | "balanced" | "direct"; focus: "left" | "center" | "right";
  width: "narrow" | "balanced" | "wide"; marking: "zonal" | "balanced" | "man"; offsideTrap: boolean;
  lineSpacing: 1 | 2 | 3;      // 라인간격: 1=압축 2=균형 3=분산
  possession: 1 | 2 | 3;      // 점유율지향성: 1=낮음 2=중간 3=높음
  transitionSpeed: 1 | 2 | 3; // 전환속도: 1=느림 2=보통 3=빠름
}

export interface SpecialInstructions {
  captainId?: string; fkTakerId?: string; ckTakerId?: string;
  manMark?: { markerId: string; targetId: string };
  ckBigMenForward: boolean;
}

export interface SideSetup {
  teamId: string;
  lineup: Record<string, string>;   // slotId -> playerId (11개)
  roles: Record<string, RoleId>;    // slotId -> role
  instructions: TeamInstructions;
  special: SpecialInstructions;
}

export interface RoleDef {
  id: RoleId; position: Position; nameKo: string; descKo: string;
  weights: Partial<Record<keyof PlayerAttrs | "aerial" | "setPiece" | "mental", number>>; // 합=1
  attackBias: number; // -0.1~+0.1 (라인 기여 배분: +면 공격 기여↑ 수비 기여↓)
}

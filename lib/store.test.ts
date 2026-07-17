// sessionStorage 모킹은 스토어 모듈을 import하기 "전에" 전역에 설치해야 한다 —
// lib/store.ts는 모듈 최상단에서 persist(create(...))를 호출하므로, storage
// getter(typeof sessionStorage 체크)가 평가되는 시점에 이미 globalThis.sessionStorage가
// 있어야 persist가 실제 스토리지를 붙잡는다. vitest 환경은 "node"라 기본적으로
// window/sessionStorage가 전혀 없으므로 최소 in-memory Storage 스텁을 직접 만든다.
// vitest 자체는 정적 import로 가져와도 무방하다(store.ts를 참조하지 않으므로 순서
// 문제가 없다) — "./store"만 동적 import로 지연시켜 스텁 설치 이후에 평가되게 한다.
import { describe, it, expect, beforeEach } from "vitest";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

const sessionStorageStub = new MemoryStorage();
(globalThis as unknown as { sessionStorage: Storage }).sessionStorage = sessionStorageStub;

const { useAppStore } = await import("./store");

describe("store", () => {
  beforeEach(() => {
    sessionStorageStub.clear();
    useAppStore.getState().reset();
  });

  it("startQuick 후 me/opp 라인업 11개 채워짐", () => {
    useAppStore.getState().startQuick();
    const { me, opp, setup } = useAppStore.getState();
    expect(setup.myTeamId).toBe("kor");
    expect(setup.oppTeamId).toBe("bra");
    expect(setup.venueId).toBe("metlife");
    expect(me).toBeDefined();
    expect(opp).toBeDefined();
    expect(Object.keys(me!.lineup)).toHaveLength(11);
    expect(Object.keys(opp!.lineup)).toHaveLength(11);
    expect(new Set(Object.values(me!.lineup)).size).toBe(11); // 중복 배치 없음
  });

  it("movePlayer로 배치된 슬롯 선수 교환", () => {
    useAppStore.getState().startQuick();
    const before = useAppStore.getState().me!;
    const wgLId = before.lineup["wg_l"];
    const wgRId = before.lineup["wg_r"];
    expect(wgLId).not.toBe(wgRId);

    useAppStore.getState().movePlayer("wg_l", wgRId);

    const after = useAppStore.getState().me!;
    expect(after.lineup["wg_l"]).toBe(wgRId);
    expect(after.lineup["wg_r"]).toBe(wgLId); // 스왑 확인
    expect(Object.keys(after.lineup)).toHaveLength(11);
    expect(new Set(Object.values(after.lineup)).size).toBe(11);
  });

  it("setInstructions(formation 변경) 시 라인업 재배치", () => {
    useAppStore.getState().startQuick();
    const before = useAppStore.getState().me!;
    expect(before.instructions.formation).toBe("4-3-3");
    expect(Object.keys(before.lineup).sort()).toEqual(
      ["cb1", "cb2", "cm_l", "cm_r", "dm", "fb_l", "fb_r", "gk", "st", "wg_l", "wg_r"].sort()
    );

    useAppStore.getState().setInstructions({ formation: "4-4-2" });

    const after = useAppStore.getState().me!;
    expect(after.instructions.formation).toBe("4-4-2");
    expect(Object.keys(after.lineup).sort()).toEqual(
      ["cb1", "cb2", "cm_l", "cm_r", "fb_l", "fb_r", "gk", "st1", "st2", "wg_l", "wg_r"].sort()
    );
    expect(Object.keys(after.lineup)).toHaveLength(11);
    // 포메이션 외 다른 지시사항은 보존되어야 함
    expect(after.instructions.pressing).toBe(before.instructions.pressing);
    expect(after.instructions.tempo).toBe(before.instructions.tempo);
  });

  it("persist: 스토어 조작 후 sessionStorage 'dugout-v1'에 상태 존재", () => {
    useAppStore.getState().startQuick();
    const raw = sessionStorageStub.getItem("dugout-v1");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.setup.myTeamId).toBe("kor");
    expect(parsed.state.me).toBeDefined();
  });
});

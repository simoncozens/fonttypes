import { normalizeLocation } from "../src/designspaces";
import type { Axis } from "../src/designspaces";

describe("normalizeLocation", () => {
  it("should normalize a location", () => {
    const axes: Axis[] = [{ tag: "wght", min: 100, default: 400, max: 900 }];
    expect(normalizeLocation({ wght: 400 }, axes)).toEqual({ wght: 0.0 });
    expect(normalizeLocation({ wght: 100 }, axes)).toEqual({ wght: -1.0 });
    expect(normalizeLocation({ wght: 900 }, axes)).toEqual({ wght: 1.0 });
    expect(normalizeLocation({ wght: 650 }, axes)).toEqual({ wght: 0.5 });
    expect(normalizeLocation({ wght: 1000 }, axes)).toEqual({ wght: 1.0 });
    expect(normalizeLocation({ wght: 0 }, axes)).toEqual({ wght: -1.0 });

    const axes2: Axis[] = [{ tag: "wght", min: 0, default: 0, max: 1000 }];
    expect(normalizeLocation({ wght: 0 }, axes2)).toEqual({ wght: 0.0 });
    expect(normalizeLocation({ wght: -1 }, axes2)).toEqual({ wght: 0.0 });
    expect(normalizeLocation({ wght: 1000 }, axes2)).toEqual({ wght: 1.0 });
    expect(normalizeLocation({ wght: 500 }, axes2)).toEqual({ wght: 0.5 });
    expect(normalizeLocation({ wght: 1001 }, axes2)).toEqual({ wght: 1.0 });

    const axes3: Axis[] = [{ tag: "wght", min: 0, default: 1000, max: 1000 }];
    expect(normalizeLocation({ wght: 0 }, axes3)).toEqual({ wght: -1.0 });
    expect(normalizeLocation({ wght: -1 }, axes3)).toEqual({ wght: -1.0 });
    expect(normalizeLocation({ wght: 500 }, axes3)).toEqual({ wght: -0.5 });
    expect(normalizeLocation({ wght: 1000 }, axes3)).toEqual({ wght: 0.0 });
    expect(normalizeLocation({ wght: 1001 }, axes3)).toEqual({ wght: 0.0 });
  });
});

import { supportScalar, VariationModel } from "../src/variationmodel";
import { NormalizedLocation } from "../src/designspaces";

describe("supportScalar", () => {
  it("should compute support scalar", () => {
    expect(supportScalar({}, {})).toBe(1.0);
    expect(supportScalar({ wght: 0.2 }, {})).toBe(1.0);
    expect(supportScalar({ wght: 0.2 }, { wght: [0, 2, 3] })).toBeCloseTo(0.1);
    expect(supportScalar({ wght: 2.5 }, { wght: [0, 2, 4] })).toBeCloseTo(0.75);
    expect(supportScalar({ wght: 3 }, { wght: [0, 2, 2] })).toBeCloseTo(0.0);
  });
});

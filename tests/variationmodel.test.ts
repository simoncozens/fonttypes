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

describe("VariationModel", () => {
  it("should sort master locations", () => {
    // "locations, axisOrder, sortedLocs, supports, deltaWeights",
    let locations = [
      { wght: 0.55, wdth: 0.0 },
      { wght: -0.55, wdth: 0.0 },
      { wght: -1.0, wdth: 0.0 },
      { wght: 0.0, wdth: 1.0 },
      { wght: 0.66, wdth: 1.0 },
      { wght: 0.66, wdth: 0.66 },
      { wght: 0.0, wdth: 0.0 },
      { wght: 1.0, wdth: 1.0 },
      { wght: 1.0, wdth: 0.0 },
    ];
    let axisOrder = ["wght"];
    let sortedLocs = [
      {},
      { wght: -0.55 },
      { wght: -1.0 },
      { wght: 0.55 },
      { wght: 1.0 },
      { wdth: 1.0 },
      { wdth: 1.0, wght: 1.0 },
      { wdth: 1.0, wght: 0.66 },
      { wdth: 0.66, wght: 0.66 },
    ];
    let supports = [
      {},
      { wght: [-1.0, -0.55, 0] },
      { wght: [-1.0, -1.0, -0.55] },
      { wght: [0, 0.55, 1.0] },
      { wght: [0.55, 1.0, 1.0] },
      { wdth: [0, 1.0, 1.0] },
      { wdth: [0, 1.0, 1.0], wght: [0, 1.0, 1.0] },
      { wdth: [0, 1.0, 1.0], wght: [0, 0.66, 1.0] },
      { wdth: [0, 0.66, 1.0], wght: [0, 0.66, 1.0] },
    ];
    let deltaWeights = [
      {},
      { 0: 1.0 },
      { 0: 1.0 },
      { 0: 1.0 },
      { 0: 1.0 },
      { 0: 1.0 },
      { 0: 1.0, 4: 1.0, 5: 1.0 },
      {
        0: 1.0,
        3: 0.7555555555555555,
        4: 0.24444444444444444,
        5: 1.0,
        6: 0.66,
      },
      {
        0: 1.0,
        3: 0.7555555555555555,
        4: 0.24444444444444444,
        5: 0.66,
        6: 0.43560000000000004,
        7: 0.66,
      },
    ];
    let model = new VariationModel(locations, axisOrder);
    expect(model.locations).toEqual(sortedLocs);
    expect(model.supports).toEqual(supports);
    expect(model.deltaWeights).toEqual(deltaWeights);
  });

  it("should get support scalars for masters", () => {
    let locationsA = [{}, { wght: 1 }, { wdth: 1 }];
    let locationsB = [{}, { wght: 1 }, { wdth: 1 }, { wght: 1, wdth: 1 }];
    let locationsC = [
      {},
      { wght: 0.5 },
      { wght: 1 },
      { wdth: 1 },
      { wght: 1, wdth: 1 },
    ];
    let scenarios = [
      [locationsA, { wght: 0, wdth: 0 }, [1, 0, 0]],
      [locationsA, { wght: 0.5, wdth: 0 }, [0.5, 0.5, 0]],
      [locationsA, { wght: 1, wdth: 0 }, [0, 1, 0]],
      [locationsA, { wght: 0, wdth: 0.5 }, [0.5, 0, 0.5]],
      [locationsA, { wght: 0, wdth: 1 }, [0, 0, 1]],
      [locationsA, { wght: 1, wdth: 1 }, [-1, 1, 1]],
      [locationsA, { wght: 0.5, wdth: 0.5 }, [0, 0.5, 0.5]],
      [locationsA, { wght: 0.75, wdth: 0.75 }, [-0.5, 0.75, 0.75]],
      [locationsB, { wght: 1, wdth: 1 }, [0, 0, 0, 1]],
      [locationsB, { wght: 0.5, wdth: 0 }, [0.5, 0.5, 0, 0]],
      [locationsB, { wght: 1, wdth: 0.5 }, [0, 0.5, 0, 0.5]],
      [locationsB, { wght: 0.5, wdth: 0.5 }, [0.25, 0.25, 0.25, 0.25]],
      [locationsC, { wght: 0.5, wdth: 0 }, [0, 1, 0, 0, 0]],
      [locationsC, { wght: 0.25, wdth: 0 }, [0.5, 0.5, 0, 0, 0]],
      [locationsC, { wght: 0.75, wdth: 0 }, [0, 0.5, 0.5, 0, 0]],
      [locationsC, { wght: 0.5, wdth: 1 }, [-0.5, 1, -0.5, 0.5, 0.5]],
      [locationsC, { wght: 0.75, wdth: 1 }, [-0.25, 0.5, -0.25, 0.25, 0.75]],
    ];
    for (let [masterLocations, location, expected] of scenarios) {
      const model = new VariationModel(
        masterLocations as NormalizedLocation[],
        ["wdth", "wght"]
      );
      const scalars = model.getMasterScalars(location as NormalizedLocation);
      console.log({ masterLocations, location, scalars, expected });
      console.log("Supports", model.supports);
      expect(scalars).toEqual(expected);
    }
  });

  it("should create a variation model and interpolate", () => {
    const locations = [
      {},
      { axis_A: 1.0 },
      { axis_B: 1.0 },
      { axis_A: 1.0, axis_B: 1.0 },
      { axis_A: 0.5, axis_B: 1.0 },
      { axis_A: 1.0, axis_B: 0.5 },
    ];
    const axisOrder = ["axis_A", "axis_B"];
    const masterValues = [0, 10, 20, 70, 50, 60];
    const instanceLocation = {
      axis_A: 0.5,
      axis_B: 0.5,
    };
    const expectedValue = 37.5;
    const masterScalars = [0.25, 0.0, 0.0, -0.25, 0.5, 0.5];
    const model = new VariationModel(
      locations as NormalizedLocation[],
      axisOrder
    );
    const interpolatedValue = model.interpolateFromMasters(
      instanceLocation,
      masterValues
    )!;
    expect(interpolatedValue).toBeCloseTo(expectedValue);
    expect(masterScalars).toEqual(model.getMasterScalars(instanceLocation));

    expect(
      model.interpolateFromValuesAndScalars(masterValues, masterScalars)!
    ).toBeCloseTo(interpolatedValue);
  });
});

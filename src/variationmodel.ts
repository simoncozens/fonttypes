import { NormalizedLocation } from "./designspaces";

/**
 * Support type representing the influence region of a master.
 * Each key is an axis tag, and the value is a tuple of [lower, peak, upper] coordinates.
 * @group Interpolation and Variation Models
 * @category Variation models
 * @summary Represents the support region of a master in a variation model
 */
export type Support = Record<string, [number, number, number]>;

/**
 * Returns the scalar multiplier at location, for a master with support.
 * @param location - The normalized location to evaluate
 * @param support - The `Support` of the master
 * @group Interpolation and Variation Models
 * @category Variation models
 * @summary Return the support scalar for a given location and support
 */
export function supportScalar(
  location: NormalizedLocation,
  support: Support
): number {
  let scalar = 1;
  for (var [tag, [lower, peak, upper]] of Object.entries(support)) {
    if (peak == 0) {
      continue;
    }
    if (lower > peak || peak > upper) {
      continue;
    }
    if (lower < 0 && upper > 0) {
      continue;
    }
    var v = (location[tag] || 0) as number;
    if (v == peak) {
      continue;
    }
    if (v <= lower || upper <= v) {
      scalar = 0;
      break;
    }
    if (v < peak) {
      scalar *= (v - lower) / (peak - lower);
    } else {
      scalar *= (v - upper) / (peak - upper);
    }
  }
  return scalar;
}

type SortFunction = (a: NormalizedLocation, b: NormalizedLocation) => number;

function isSuperset<T>(set: Set<T>, subset: Set<T>): boolean {
  for (let elem of subset.values()) {
    if (!set.has(elem)) {
      return false;
    }
  }
  return true;
}

function subList(truth: any[], list: any[]): any[] {
  return list.filter((it, ix) => truth[ix]);
}

/**
 * A VariationModel represents an OpenType variation model for a set of masters at specific locations.
 * It is used to compute deltas, scalars, and interpolated values for arbitrary locations.
 * @group Interpolation and Variation Models
 * @category Variation models
 * @summary Represents an OpenType variation model for a set of masters
 * @example
 * ```ts
 * import { VariationModel } from "./variationmodel";
 *
 * // Define master locations
 * const locations = [
 *   { wght: 0.0 },
 *   { wght: -1.0 },
 *   { wght: 1.0 },
 * ];
 *
 * // Create a variation model
 * const model = new VariationModel(locations, ["wght"]);
 * // Interpolate!
 * const loc: NormalizedLocation = { wght: 0.5 };
 * const masterValues = [ 0, -20, 20 ]; // Values at each master
 * const value = model.interpolateFromMasters(loc, masterValues);
 * console.log(value); // Should print 10
 * ```
 */
export class VariationModel {
  origLocations: NormalizedLocation[];
  locations: NormalizedLocation[];
  supports: Support[];
  axisOrder: string[];
  mapping: number[];
  reverseMapping: number[];
  private subModels: Map<number[], VariationModel>;
  deltaWeights: Record<number, number>[];

  /**
   *
   * @param locations Normalized master locations in the model
   * @param axisOrder A list of axis tags defining the order of axes
   */
  constructor(locations: NormalizedLocation[], axisOrder: string[]) {
    this.axisOrder = [];
    this.origLocations = locations;
    this.deltaWeights = []; // Make compiler happier
    this.supports = []; // Make compiler happier
    var loc2: NormalizedLocation[] = [];
    for (var loc of this.origLocations) {
      loc2.push(
        Object.keys(loc)
          .filter((tag) => loc[tag] != 0)
          .reduce((obj: NormalizedLocation, key: string) => {
            obj[key] = loc[key]!;
            return obj;
          }, {})
      );
    }
    var [keyFunc, axisPoints] = this.getMasterLocationsSortKeyFunc(
      loc2,
      this.axisOrder
    );
    this.locations = loc2.sort(keyFunc);
    this.mapping = this.origLocations.map((l) =>
      this.locations.map((x) => JSON.stringify(x)).indexOf(JSON.stringify(l))
    );
    this.reverseMapping = this.locations.map((l) =>
      this.origLocations
        .map((x) => JSON.stringify(x))
        .indexOf(JSON.stringify(l))
    );
    this.computeMasterSupports(axisPoints);
    this.subModels = new Map<number[], VariationModel>();
  }

  /**
   * Fetch a submodel for a subset of axes.
   * @group Interpolation and Variation Models
   * @category Variation models
   */
  getSubModel(items: (number | null)[]): [VariationModel, (number | null)[]] {
    if (!items.some((x) => x == null)) {
      return [this, items];
    }
    let key: number[] = items.filter((x) => x != null) as number[];
    let submodel = this.subModels.get(key);
    if (!submodel) {
      submodel = new VariationModel(subList(key, this.origLocations), []);
      this.subModels.set(key, submodel);
    }
    return [submodel, subList(key, items)];
  }

  private getMasterLocationsSortKeyFunc(
    locations: NormalizedLocation[],
    axisOrder: string[]
  ): [SortFunction, Record<string, Set<number>>] {
    var axisPoints: Record<string, Set<number>> = {};
    for (var loc of locations) {
      if (Object.keys(loc).length != 1) {
        continue;
      }
      let axis = Object.keys(loc)[0]!;
      let value = loc[axis]!;
      if (!(axis in axisPoints)) {
        axisPoints[axis] = new Set<number>().add(0);
      }
      axisPoints[axis]!.add(value as number);
    }

    var func = function (a: NormalizedLocation, b: NormalizedLocation): number {
      var keyLen = Object.keys(a).length - Object.keys(b).length;
      if (keyLen != 0) {
        return keyLen;
      }
      var onpoint_a: string[] = Object.keys(a).filter((axis) => {
        axis in axisPoints && axisPoints[axis]!.has(a[axis]! as number);
      });
      var onpoint_b: string[] = Object.keys(b).filter((axis) => {
        axis in axisPoints && axisPoints[axis]!.has(b[axis]! as number);
      });
      var onpoint = onpoint_a.length - onpoint_b.length;
      if (onpoint != 0) {
        return onpoint;
      }
      for (var axis of Object.keys(a)) {
        if (Math.sign(a[axis] as number) != Math.sign(b[axis] as number)) {
          return Math.sign(a[axis] as number) - Math.sign(b[axis] as number);
        }
      }
      return 0;
    };
    return [func, axisPoints];
  }

  private computeMasterSupports(axisPoints: Record<string, Set<number>>) {
    let supports: Support[] = [];
    let regions = this.locationsToRegions();
    for (var i in regions) {
      var region: Support = regions[i]!;
      let locAxes = new Set(Object.keys(region));
      for (var j in [...Array(i).keys()]) {
        var prev_region = regions[j]!;
        if (!isSuperset(locAxes, new Set(Object.keys(prev_region)))) {
          continue;
        }

        var relevant = true;
        for (var axis of Object.keys(region)) {
          var [lower, peak, upper] = region[axis]!;
          if (
            !(axis in prev_region) ||
            !(
              prev_region[axis]![1] == peak ||
              (lower < prev_region[axis]![1] && prev_region[axis]![1] < upper)
            )
          ) {
            relevant = false;
            break;
          }
        }
        if (!relevant) {
          continue;
        }

        // Split the box
        let bestAxes: Support = {};
        let bestRatio = -1;
        for (axis in prev_region) {
          let val = prev_region[axis]![1];
          console.assert(axis in region);
          let [lower, locV, upper] = region[axis]!;
          let [newLower, newUpper] = [lower, upper];
          var ratio;
          if (val < locV) {
            newLower = val;
            ratio = (val - locV) / (lower - locV);
          } else if (locV < val) {
            newUpper = val;
            ratio = (val - locV) / (upper - locV);
          } else {
            // Can't split box in this direction.
            continue;
          }
          if (ratio > bestRatio) {
            bestAxes = {};
            bestRatio = ratio;
          }
          if (ratio == bestRatio) {
            bestAxes[axis] = [newLower, locV, newUpper];
          }
        }
        for (var axis in bestAxes) {
          region[axis] = bestAxes[axis]!;
        }
      }
      supports.push(region);
    }
    this.supports = supports;
    this.computeDeltaWeights();
  }

  private locationsToRegions(): Support[] {
    let locations: NormalizedLocation[] = this.locations;
    let minV: NormalizedLocation = {};
    let maxV: NormalizedLocation = {};
    for (var l of locations) {
      for (var [k, v] of Object.entries(l)) {
        if (!(k in minV)) {
          minV[k] = v as number;
        }
        if (!(k in maxV)) {
          maxV[k] = v as number;
        }
        minV[k] = Math.min(v as number, minV[k] as number);
        maxV[k] = Math.max(v as number, maxV[k] as number);
      }
    }
    let regions = [];
    for (var i in locations) {
      let loc = locations[i];
      let region: Support = {};
      for (var [axis, locV] of Object.entries(loc!)) {
        if ((locV as number) > 0) {
          region[axis] = [0, locV as number, maxV[axis] as number];
        } else {
          region[axis] = [minV[axis] as number, locV as number, 0];
        }
      }
      regions.push(region);
    }
    return regions;
  }

  private computeDeltaWeights() {
    let deltaWeights: Record<number, number>[] = [];
    this.locations.forEach((loc, i) => {
      let deltaWeight: Record<number, number> = {};
      this.locations.slice(0, i).forEach((m, j) => {
        let scalar = supportScalar(loc, this.supports[j]!);
        if (scalar) {
          deltaWeight[j] = scalar;
        }
      });
      deltaWeights.push(deltaWeight);
    });
    this.deltaWeights = deltaWeights;
  }

  /**
   * Compute the deltas for a set of master values.
   * @param masterValues A value, at each master location
   * @returns A list of deltas to be applied
   * @group Interpolation and Variation Models
   * @category Variation models
   * @summary Compute deltas from master values
   */
  getDeltas(masterValues: number[]): number[] {
    console.assert(masterValues.length == this.deltaWeights.length);
    let mapping = this.reverseMapping;
    let out: number[] = [];
    this.deltaWeights.forEach((weights, i) => {
      let delta = masterValues[mapping[i]!]!;
      for (var j in weights) {
        var weight = weights[j]!;
        if (weight == 1) {
          delta -= out[j]!;
        } else {
          delta -= out[j]! * weight;
        }
      }
      out.push(delta);
    });
    return out;
  }

  /**
   * Compute the support scalars for a given location.
   * @param loc A normalized location
   * @group Interpolation and Variation Models
   * @category Variation models
   * @summary Compute support scalars for a location
   */
  getScalars(loc: NormalizedLocation): number[] {
    return this.supports.map((support) => supportScalar(loc, support));
  }

  /**
   * Interpolate a set of values from pre-fetched deltas and scalars.
   * This is useful if you need to interpolate multiple values at the same location.
   * @group Interpolation and Variation Models
   * @category Interpolation
   * @summary Interpolate from deltas and scalars
   * @param deltas A set of deltas returned from `getDeltas
   * @param scalars A set of support scalars returned from `getScalars`
   * @returns The interpolated value, or null if no contribution
   */
  interpolateFromDeltasAndScalars(
    deltas: number[],
    scalars: number[]
  ): number | null {
    let v: number | null = null;
    console.assert(deltas.length == scalars.length);
    deltas.forEach((delta, ix) => {
      let scalar = scalars[ix];
      if (!scalar) {
        return;
      }
      let contribution = delta * scalar;
      if (v == null) {
        v = contribution;
      } else {
        v += contribution;
      }
    });
    return v;
  }

  /**
   * Interpolate a value at a given location from pre-fetched deltas.
   * @group Interpolation and Variation Models
   * @category Interpolation
   * @summary Interpolate from deltas
   * @param loc A normalized location to interpolate at
   * @param deltas A set of deltas returned from `getDeltas`
   * @returns The interpolated value
   */
  interpolateFromDeltas(
    loc: NormalizedLocation,
    deltas: number[]
  ): number | null {
    let scalars = this.getScalars(loc);
    return this.interpolateFromDeltasAndScalars(deltas, scalars);
  }

  /**
   * Interpolate a value at a given location from master values.
   * @group Interpolation and Variation Models
   * @category Interpolation
   * @summary Interpolate from master values
   * @param loc A normalized location to interpolate at
   * @param masterValues A set of master values
   * @returns The interpolated value
   */
  interpolateFromMasters(loc: NormalizedLocation, masterValues: number[]) {
    let deltas = this.getDeltas(masterValues);
    return this.interpolateFromDeltas(loc, deltas);
  }

  /**
   * Interpolate a value from master values and pre-fetched scalars.
   * This is useful if you need to interpolate multiple values at the same location.
   * @group Interpolation and Variation Models
   * @category Interpolation
   * @summary Interpolate from master values and scalars
   * @param masterValues A set of master values
   * @param scalars A set of support scalars returned from `getScalars`
   * @returns The interpolated value
   */
  interpolateFromMastersAndScalars(masterValues: number[], scalars: number[]) {
    let deltas = this.getDeltas(masterValues);
    return this.interpolateFromDeltasAndScalars(deltas, scalars);
  }
}

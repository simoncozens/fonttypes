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
    this.axisOrder = axisOrder;
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
    var keyFunc = this.getMasterLocationsSortKeyFunc(loc2, this.axisOrder);
    this.locations = loc2.sort(keyFunc);
    console.log("Sorted locations:", this.locations);
    this.mapping = this.origLocations.map((l) =>
      this.locations.map((x) => JSON.stringify(x)).indexOf(JSON.stringify(l))
    );
    this.reverseMapping = this.locations.map((l) =>
      this.origLocations
        .map((x) => JSON.stringify(x))
        .indexOf(JSON.stringify(l))
    );
    this.computeMasterSupports();
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
  ): SortFunction {
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

    const getSortFunc = (
      axisPoints: Record<string, Set<number>>,
      axisOrder: string[]
    ) => {
      const sign = (v: number) => {
        return v < 0 ? -1 : v > 0 ? +1 : 0;
      };
      const sortFunc = (
        loc_a: NormalizedLocation,
        loc_b: NormalizedLocation
      ) => {
        let rank_a = Object.keys(loc_a).length;
        let onPointAxes_a = Object.entries(loc_a).filter(
          ([axis, value]) =>
            axis in axisPoints && axisPoints[axis]!.has(value as number)
        );
        let orderedAxes_a = axisOrder.filter((axis) => axis in loc_a);
        // Now add any axis appearing in the location but not in axisOrder
        for (let axis of Object.keys(loc_a).sort()) {
          if (!axisOrder.includes(axis)) {
            orderedAxes_a.push(axis);
          }
        }
        // Now do all that for location b
        let rank_b = Object.keys(loc_b).length;
        let onPointAxes_b = Object.entries(loc_b).filter(
          ([axis, value]) =>
            axis in axisPoints && axisPoints[axis]!.has(value as number)
        );
        let orderedAxes_b = axisOrder.filter((axis) => axis in loc_b);
        for (let axis of Object.keys(loc_b).sort()) {
          if (!axisOrder.includes(axis)) {
            orderedAxes_b.push(axis);
          }
        }
        // Sort them first in order of rank
        if (rank_a != rank_b) {
          return rank_a - rank_b;
        }
        console.log("Ranks are same, checking on-point axes");
        // Next by decreasing number of on-point axes
        if (onPointAxes_a.length != onPointAxes_b.length) {
          return onPointAxes_b.length - onPointAxes_a.length;
        }
        console.log("On-point axes are same, checking axis order");
        // Next, by axis order, known axes first
        /*
        tuple(
          axisOrder.index(axis) if axis in axisOrder else 0x10000
          for axis in orderedAxes
        )
        */
        let axisOrders_a = [...orderedAxes_a].map((axis) =>
          axisOrder.includes(axis) ? axisOrder.indexOf(axis) : 0x10000
        );
        let axisOrders_b = [...orderedAxes_b].map((axis) =>
          axisOrder.includes(axis) ? axisOrder.indexOf(axis) : 0x10000
        );
        for (
          let i = 0;
          i < Math.min(axisOrders_a.length, axisOrders_b.length);
          i++
        ) {
          if (axisOrders_a[i]! != axisOrders_b[i]!) {
            return axisOrders_a[i]! - axisOrders_b[i]!;
          }
        }
        console.log("Axis order same, checking all axes");
        // Next, by all axes
        // Compare lexicographically, element by element
        const minLen = Math.min(orderedAxes_a.length, orderedAxes_b.length);
        for (let i = 0; i < minLen; i++) {
          const axisA = orderedAxes_a[i]!;
          const axisB = orderedAxes_b[i]!;
          if (axisA != axisB) {
            return axisA < axisB ? -1 : 1;
          }
        }
        // If all compared elements are equal, the shorter array comes first
        if (orderedAxes_a.length != orderedAxes_b.length) {
          return orderedAxes_a.length - orderedAxes_b.length;
        }

        // Finally, by sign and absolute value
        for (let axis of orderedAxes_a) {
          let sign_a = sign(loc_a[axis] as number);
          let sign_b = sign(loc_b[axis] as number);
          if (sign_a != sign_b) {
            return sign_a - sign_b;
          }
          let abs_a = Math.abs(loc_a[axis] as number);
          let abs_b = Math.abs(loc_b[axis] as number);
          if (abs_a != abs_b) {
            return abs_a - abs_b;
          }
        }
        return 0;
      };
      return sortFunc;
    };
    return getSortFunc(axisPoints, axisOrder);
  }

  private computeMasterSupports() {
    let supports: Support[] = [];
    let regions = this.locationsToRegions();
    for (let i = 0; i < regions.length; i++) {
      var region: Support = regions[i]!;
      let locAxes = new Set(Object.keys(region));
      for (let j = 0; j < i; j++) {
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
    for (let i = 0; i < locations.length; i++) {
      let loc = locations[i]!;
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
   * Return multipliers for each master, for the given location.
   * 
   * If interpolating many master-values at the same location,
   * this function allows speed up by fetching the scalars once
   * and using them with interpolateFromValuesAndScalars().
   * 
   * Note that the scalars used in interpolateFromMastersAndScalars()
   * are *not* the same as the ones returned here. They are the result
   * of getScalars().
   * 
   * @param loc A normalized location
   * @returns Scalars for each master in the original input order
   * @group Interpolation and Variation Models
   * @category Variation models
   * @summary Get master scalars for interpolation
   */
  getMasterScalars(loc: NormalizedLocation): number[] {
    let out = this.getScalars(loc);
    // Process in reverse order
    for (let i = this.deltaWeights.length - 1; i >= 0; i--) {
      const weights = this.deltaWeights[i]!;
      for (const j in weights) {
        const weight = weights[j]!;
        out[j] -= out[i]! * weight;
      }
    }
    // Remap to original order
    return this.mapping.map((idx) => out[idx]!);
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
    return this.interpolateFromValuesAndScalars(deltas, scalars);
  }

  /**
   * Interpolate from values and scalars coefficients.
   * 
   * If the values are master-values, then the scalars should be
   * fetched from getMasterScalars().
   * 
   * If the values are deltas, then the scalars should be fetched
   * from getScalars(); in which case this is the same as
   * interpolateFromDeltasAndScalars().
   * 
   * @param values Values to interpolate (either master values or deltas)
   * @param scalars Scalars in the same order as values
   * @returns The interpolated value, or null if no contribution
   * @group Interpolation and Variation Models
   * @category Interpolation
   * @summary Interpolate from values and scalars
   */
  interpolateFromValuesAndScalars(
    values: number[],
    scalars: number[]
  ): number | null {
    let v: number | null = null;
    console.assert(values.length == scalars.length);
    values.forEach((value, ix) => {
      let scalar = scalars[ix];
      if (!scalar) {
        return;
      }
      let contribution = value * scalar;
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
    let scalars = this.getMasterScalars(loc);
    return this.interpolateFromValuesAndScalars(masterValues, scalars);
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

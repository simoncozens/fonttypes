const _Designspace: unique symbol = Symbol();
const _Userspace: unique symbol = Symbol();
const _Normalized: unique symbol = Symbol();

/**
 * @group Coordinates And Locations
 * @category Coordinate Spaces
 * @summary The design coordinate space
 */
export type Designspace = typeof _Designspace;
/**
 * @group Coordinates And Locations
 * @category Coordinate Spaces
 * @summary The user coordinate space
 */
export type Userspace = typeof _Userspace;
/**
 * @group Coordinates And Locations
 * @category Coordinate Spaces
 * @summary The normalized coordinate space
 */
export type Normalized = typeof _Normalized;
/**
 * A union of coordinate spaces. You probably won't use this directly,
 * as it is used to create generic types over coordinate spaces.
 *
 * @group Coordinates And Locations
 * @category Coordinate Spaces
 * @summary A union of all coordinate spaces
 */
export type Space = Designspace | Userspace | Normalized;

// Create distinct branded types for each coordinate space
declare const designspaceBrand: unique symbol;
declare const userspaceBrand: unique symbol;
declare const normalizedBrand: unique symbol;

/**
 * A Coordinate represents a coordinate in a specific coordinate space.
 * This is generic over the coordinate space type parameter T. It is
 * generally more useful to use the type aliases for specific spaces:
 * - UserspaceCoordinate
 * - DesignspaceCoordinate
 * - NormalizedCoordinate
 * @summary A coordinate in a specific coordinate space
 * @group Coordinates And Locations
 * @category Coordinates
 */
export interface Coordinate<T extends Space> extends Number {
  readonly [designspaceBrand]?: T extends Designspace ? true : never;
  readonly [userspaceBrand]?: T extends Userspace ? true : never;
  readonly [normalizedBrand]?: T extends Normalized ? true : never;
}

/**
 *
 * A UserCoordinate represents a coordinate in user space;
 * for example, "wght=400" as input to a variable font.
 * @summary A coordinate in user space
 * @group Coordinates And Locations
 * @category Coordinates
 */

export type UserspaceCoordinate = Coordinate<Userspace>;

/**
 * A DesignspaceCoordinate represents a coordinate in design space;
 * for example, masters in a variable font are generally designed in
 * a separate design space to the external coordinates.
 *
 * @group Coordinates And Locations
 * @category Coordinates
 * @summary A coordinate in design space
 */
export type DesignspaceCoordinate = Coordinate<Designspace>;

/**
 * A NormalizedCoordinate represents a coordinate in normalized space;
 * for example, the internal representation of variable font deltas,
 * in the range -1.0 to 1.0.
 *
 * @group Coordinates And Locations
 * @category Coordinates
 * @summary A coordinate in normalized space
 */
export type NormalizedCoordinate = Coordinate<Normalized>;

/**
 * Marks a bare number as being a coordinate in normalized space.
 * Clamps the value to the range -1.0 to 1.0.
 *
 * @param value - The number to convert
 * @returns A normalized space coordinate
 * @group Coordinates And Locations
 * @category Coordinates
 * @summary Create a normalized space coordinate, clamped to -1.0 to 1.0
 */
export function toNormalized(value: number): Coordinate<Normalized> {
  /* Clamp to -1.0 to 1.0 */
  const clamped = Math.max(-1.0, Math.min(1.0, value));
  return clamped as any;
}

/**
 * A Location represents a mapping of axis names to coordinates in a specific space.
 * For example, `{ wght: 400, wdth: 100 }`.
 *
 * @group Coordinates And Locations
 * @category Locations
 * @summary A location, in some coordinate space
 */
export type Location<T extends Space> = {
  [key: string]: Coordinate<T>;
};
/**
 * A DesignspaceLocation represents a location in design space;
 * for example: `{ wght: 25, wdth: 1 }`.
 *
 * @group Coordinates And Locations
 * @category Locations
 * @summary A location in design space
 */
export type DesignspaceLocation = Location<Designspace>;
/**
 * A UserspaceLocation represents a location in user space;
 * for example: `{ wght: 400, wdth: 100 }`.
 *
 * @group Coordinates And Locations
 * @category Locations
 * @summary A location in user space
 */
export type UserspaceLocation = Location<Userspace>;
/**
 * A NormalizedLocation represents a location in normalized space;
 * for example: `{ wght: 0.0, wdth: -1.0 }`.
 *
 * @group Coordinates And Locations
 * @category Locations
 * @summary A location in normalized space
 */
export type NormalizedLocation = Location<Normalized>;

/**
 * A `Mapping` represents a piecewise linear mapping from one coordinate space to another.
 * Each entry in the array is a tuple of `[from, to]` coordinates.
 *
 * @group Coordinates And Locations
 * @category Mapping Between Coordinate Spaces
 * @summary A piecewise linear mapping between coordinate spaces
 */
export type Mapping<SpaceFrom extends Space, SpaceTo extends Space> = [
  Coordinate<SpaceFrom>,
  Coordinate<SpaceTo>,
][];
/**
 * A mapping from design space to user space.
 * @group Coordinates And Locations
 * @category Mapping Between Coordinate Spaces
 * @summary An array which maps design space coordinates to user space coordinates
 */
export type DesignspaceToUserspaceMapping = Mapping<Designspace, Userspace>;
/**
 * A mapping from user space to design space.
 * @group Coordinates And Locations
 * @category Mapping Between Coordinate Spaces
 * @summary An array which maps user space coordinates to design space coordinates
 */
export type UserspaceToDesignspaceMapping = Mapping<Userspace, Designspace>;

/**
 * Apply a piecewise linear mapping to a coordinate, changing its coordinate space.
 * @param input
 * @param mapping
 * @returns A coordinate in the target space
 * @group Coordinates And Locations
 * @category Mapping Between Coordinate Spaces
 * @summary Map a coordinate between spaces
 */
export function piecewiseLinearMap<
  SpaceFrom extends Space,
  SpaceTo extends Space,
>(
  input: Coordinate<SpaceFrom>,
  mapping: Mapping<SpaceFrom, SpaceTo>,
): Coordinate<SpaceTo> {
  if (mapping.length === 0) {
    return input as any;
  }

  // We know mapping must have a length now, silly Typescript
  if (input <= mapping[0]![0]) {
    return mapping[0]![1];
  }
  if (input >= mapping[mapping.length - 1]![0]) {
    return mapping[mapping.length - 1]![1];
  }

  for (let i = 0; i < mapping.length - 1; i++) {
    const [x0, y0] = mapping[i]!;
    const [x1, y1] = mapping[i + 1]!;
    if (input >= x0 && input <= x1) {
      const t =
        ((input as number) - (x0 as number)) /
        ((x1 as number) - (x0 as number));
      return ((y0 as number) +
        t * ((y1 as number) - (y0 as number))) as Coordinate<SpaceTo>;
    }
  }

  return input as any;
}

/**
 * A definition of an axis in a variable font.
 * @group Font source objects
 * @summary A variable font axis
 */
export interface Axis {
  /** The four-character tag of the axis, e.g. 'wght' */
  tag: string;
  /** The display name of the axis, e.g. 'Weight' */
  name?: string;
  /** The minimum value of the axis in user space */
  min: UserspaceCoordinate;
  /** The maximum value of the axis in user space */
  max: UserspaceCoordinate;
  /** The default value of the axis in user space */
  default: UserspaceCoordinate;
  /** The mapping from user space to design space */
  map?: Mapping<Userspace, Designspace>;
  /** Whether the axis is hidden from user interfaces */
  hidden?: boolean;
}

/**
 * Convert a userspace location to a designspace location.
 * @param location - The userspace location to convert
 * @param axes - The axes definitions to use for the conversion
 * @returns The corresponding designspace location
 * @group Coordinates And Locations
 * @category Mapping Between Coordinate Spaces
 * @summary Convert a userspace location to a designspace location
 *
 * @example
 * ```ts
 * let weightMap: UserspaceToDesignspaceMapping = [
 *  [100, 100],
 *  [400, 400],
 *  [700, 600],
 *  [900, 900]
 * ];
 * const axes: Axis[] = [
 *  {
 *    tag: "wght",
 *    min: 100,
 *    default: 400,
 *    max: 900,
 *    map: weightMap
 *  }
 * ];
 * const userLocation: UserspaceLocation = { wght: 650 };
 * const designLocation = userspaceToDesignspace(userLocation, axes);
 */
export function userspaceToDesignspace(
  location: UserspaceLocation,
  axes: Axis[],
): DesignspaceLocation {
  const result: DesignspaceLocation = {};
  for (const axis of axes) {
    const tag = axis.tag;
    const userValue = location[tag] ?? axis.default;
    const mapping = axis.map ?? [];
    result[tag] = piecewiseLinearMap(userValue, mapping);
  }
  return result;
}

/**
 * Convert a designspace location to a userspace location.
 * @param location - The designspace location to convert
 * @param axes - The axes definitions to use for the conversion
 * @returns The corresponding userspace location
 * @group Coordinates And Locations
 * @category Mapping Between Coordinate Spaces
 * @summary Convert a designspace location to a userspace location
 */
export function designspaceToUserspace(
  location: DesignspaceLocation,
  axes: Axis[],
): UserspaceLocation {
  const result: UserspaceLocation = {};
  for (const axis of axes) {
    const tag = axis.tag;
    const designValue = location[tag] ?? axis.default;
    // Invert the mapping for designspace to userspace
    const invertedMapping: Mapping<Designspace, Userspace> = (
      axis.map ?? []
    ).map(([user, design]) => [design, user]);
    result[tag] = piecewiseLinearMap(designValue as number, invertedMapping);
  }
  return result;
}

/** Normalize a single designspace value to a normalized value.
 * @param designValue - The designspace coordinate to normalize
 * @param axis - The axis definition to use for normalization
 * @param extrapolate - Whether to allow extrapolation outside the axis bounds
 * @returns The corresponding normalized coordinate
 * @group Coordinates And Locations
 * @category Mapping Between Coordinate Spaces
 * @summary Normalize a designspace coordinate to normalized space
 *
 * @example
 * ```ts
 * normalizeValue(400, { tag: 'wght', min: 100, default: 400, max: 900 });
 * // Returns 0.0
 * ```
 */
export function normalizeValue(
  designValue: DesignspaceCoordinate,
  axis: Axis,
  extrapolate: boolean = false,
): NormalizedCoordinate {
  /*
    >>> normalizeValue(400, (100, 400, 900))
    0.0
    >>> normalizeValue(100, (100, 400, 900))
    -1.0
    >>> normalizeValue(650, (100, 400, 900))
    0.5
    */
  let lower = axis.min as number;
  let upper = axis.max as number;
  let _default = axis.default as number;
  if (!(lower <= _default && _default <= upper)) {
    throw new Error(
      `Invalid axis values, must be minimum, default, maximum: ` +
        `${lower.toFixed(3)}, ${_default.toFixed(3)}, ${upper.toFixed(3)}`,
    );
  }
  let v = designValue as number;
  if (!extrapolate) {
    v = Math.max(Math.min(v, upper), lower);
  }

  if (v == _default || lower == upper) {
    return 0.0;
  }

  if (
    (v < _default && lower != _default) ||
    (v > _default && upper == _default)
  ) {
    return (v - _default) / (_default - lower);
  } else {
    return (v - _default) / (upper - _default);
  }
}

/**
 * Convert a designspace location to a normalized location.
 * @param location - The designspace location to convert
 * @param axes - The axes definitions to use for the conversion
 * @returns The corresponding normalized location
 * @group Coordinates And Locations
 * @category Mapping Between Coordinate Spaces
 * @summary Convert a designspace location to a normalized location
 */
export function normalizeLocation(
  location: DesignspaceLocation,
  axes: Axis[],
): NormalizedLocation {
  const result: NormalizedLocation = {};
  for (const axis of axes) {
    const tag = axis.tag;
    const designValue = (location[tag] ?? axis.default) as number;
    result[tag] = normalizeValue(designValue, axis);
  }
  return result;
}

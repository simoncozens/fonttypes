/**
 * @packageDocumentation
 *
 * @groupDescription Coordinates And Locations
 * Work with coordinates and locations in different spaces (design, user, and normalized).
 * These are core building blocks for variable font interpolation.
 *
 * @categoryDescription Coordinates
 * Types representing individual coordinate values in different spaces.
 * By applying typings to these coordinates, it becomes impossible to mix
 * them up accidentally. For example
 *
 * ```ts
 * const defaultValue: UserspaceCoordinate = 400;
 * const min: DesignspaceCoordinate = 24;
 * const max: UserspaceCoordinate = 900;
 * const axis: Axis = {
 *     tag: 'wght',
 *     name: 'Weight',
 *     min, // Won't compile, type error
 *     max,
 *     default: defaultValue
 * };
 * ```
 *
 * @categoryDescription Locations
 * Types representing mappings of axis names to coordinates, hence
 * representing a location in some coordinate space; for example:
 * ```ts
 * const location1: DesignspaceLocation = {wght: 120, wdth: 1};
 * const location2: UserspaceLocation = {wght: 400, wdth: 75};
 * ```
 *
 * @categoryDescription Coordinate Spaces
 * Marker types representing different coordinate spaces. You probably
 * won't use these directly, but use the type aliases which use these
 * as type parameters instead.
 *
 * @categoryDescription Mapping Between Coordinate Spaces
 * Types and functions to help move between different coordinate spaces.
 */

export * from "./designspaces";
export * from "./variationmodel";

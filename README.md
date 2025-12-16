# fonttypes

This is `fonttypes`, a TypeScript library for font engineering.
It will be primarily useful for people working with variable fonts,
especially at the source level; it includes types for designspaces,
coordinates, locations, variation models, and provides utility functions
for OpenType interpolation.

## Installation

```bash
npm install fonttypes
```

## Usage

This library uses branded types to ensure that you don't mix up different
coordinate spaces. For example, you can't pass a `UserspaceCoordinate` to a
function that expects a `DesignspaceCoordinate`. It also provides functions
to convert between these spaces, and to normalize locations for interpolation.

It provides a `VariationModel` class that can be used to perform
interpolation given a set of master locations and corresponding values.

Here's an example of how to use the library to convert between coordinate
spaces and interpolate a value in a variable font.

```ts
import {
  UserspaceCoordinate,
  DesignspaceLocation,
  UserspaceLocation,
  UserspaceToDesignspaceMapping,
  Axis,
  userspaceToDesignspace,
  normalizeLocation,
  VariationModel,
  NormalizedLocation,
} from "fonttypes";

// Define the axes for a variable font
let weightMap: UserspaceToDesignspaceMapping = [
  [100, 100],
  [400, 400],
  [700, 600],
  [900, 900],
];

let axisMin: DesignspaceCoordinate = 100;
const axes: Axis[] = [
  {
    tag: "wght",
    name: "Weight",
    min: axisMin, // Oops, this won't compile!
    default: 400,
    max: 900,
    map: weightMap,
  },
];

// Convert a userspace location to a designspace location
const userLocation: UserspaceLocation = { wght: 650 };
const designLocation: DesignspaceLocation = userspaceToDesignspace(
  userLocation,
  axes,
);
console.log("Designspace location:", designLocation);
// -> Designspace location: { wght: 550 }

// Normalize the designspace location
const normalizedLocation: NormalizedLocation = normalizeLocation(
  designLocation,
  axes,
);
console.log("Normalized location:", normalizedLocation);
// -> Normalized location: { wght: 0.3 }

// --- Interpolation ---

// Define master locations in normalized space
const masterLocations: NormalizedLocation[] = [
  { wght: 0.0 },
  { wght: -1.0 },
  { wght: 1.0 },
];

// Create a variation model
const model = new VariationModel(masterLocations, ["wght"]);

// Values for a glyph component's x-position at each master location
const masterValues = [150, 100, 250]; // Corresponds to default, min, max

// Interpolate the x-position at our normalized location
const interpolatedValue = model.interpolateFromMasters(
  normalizedLocation,
  masterValues,
);

console.log("Interpolated value:", interpolatedValue);
// -> Interpolated value: 180
```

## Building and Testing

To build the library from source, run:

```bash
npm run build
```

To run the tests, use:

```bash
npm run test
```

## API Documentation

Full API documentation is available at https://simoncozens.github.io/fonttypes/

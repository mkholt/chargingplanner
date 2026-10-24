// Runs before any other setup file, so app modules loaded later see the patched globals.

// jsdom has its own Uint8Array, but Node's TextEncoder returns Node's. jose checks
// `instanceof Uint8Array` and rejects those, so return arrays from the jsdom realm instead.
const NodeTextEncoder = globalThis.TextEncoder;
globalThis.TextEncoder = class extends NodeTextEncoder {
  encode(input?: string): Uint8Array<ArrayBuffer> {
    return new Uint8Array(super.encode(input));
  }
};

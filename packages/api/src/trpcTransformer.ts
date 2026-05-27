import superjson from "superjson";

function isSuperjsonWire(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    Object.prototype.hasOwnProperty.call(value, "json")
  );
}

function deserializeValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (isSuperjsonWire(value)) {
    return superjson.deserialize(
      value as Parameters<typeof superjson.deserialize>[0],
    );
  }
  return value;
}

/** Shared tRPC transformer — tolerates plain JSON if superjson wire format is missing. */
export const trpcTransformer = {
  input: {
    serialize: (value: unknown) => superjson.serialize(value),
    deserialize: deserializeValue,
  },
  output: {
    serialize: (value: unknown) => superjson.serialize(value),
    deserialize: deserializeValue,
  },
};

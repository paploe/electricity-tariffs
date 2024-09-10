type JsonObject = { [key: string]: any };

export function mergeJsonFiles(jsonObjects: JsonObject[]): JsonObject {
  const result: JsonObject = {};

  jsonObjects.forEach((jsonObject) => {
    Object.keys(jsonObject).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        // Increment the count for this key
        result[key] = {
          ...(result[key] || {}),
          ...jsonObject[key],
        };
      } else {
        // First occurrence of the key
        result[key] = jsonObject[key];
      }
    });
  });

  return result;
}

type JsonObject = { [key: string]: any };

export function mergeJsonFiles(jsonObjects: JsonObject[]): JsonObject {
  const result: JsonObject = {};
  const keyCount: { [key: string]: number } = {}; // To track the number of duplicates

  jsonObjects.forEach((jsonObject) => {
    Object.keys(jsonObject).forEach((key) => {
      if (result.hasOwnProperty(key)) {
        // Increment the count for this key
        keyCount[key] = keyCount[key] ? keyCount[key] + 1 : 1;
        const newKey = `${key}_${keyCount[key]}`;
        result[newKey] = jsonObject[key];
      } else {
        // First occurrence of the key
        result[key] = jsonObject[key];
        keyCount[key] = 0; // Initialize count for this key
      }
    });
  });

  return result;
}

import Ajv from "ajv";
const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}

export function validateJson(json, schemaJson) {
  const schemaObject = JSON.parse(schemaJson);
  const validate = ajv.compile(schemaObject);
  const data = JSON.parse(json);
  const valid = validate(data);
  if (!valid) console.log(validate.errors);
}

#!/usr/bin/env node
/**
 * jsonToModel.js
 *
 * Single file:
 *   node jsonToModel.js users.json --model User --mongoose User.js
 *
 * Batch:
 *   node jsonToModel.js --auto-ref --clean --js-deep --input . --output ./models
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const CRUD_MODES = ["all", "find", "findById", "create", "updateById", "deleteById"];

function mongoType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") {
    if ("$oid" in value) return "ObjectId";
    if ("$date" in value) return "Date";
    if ("$numberDecimal" in value) return "Decimal128";
    if ("$numberLong" in value) return "Long";
    if ("$binary" in value) return "Binary";
    return "object";
  }
  return typeof value;
}

function inferSchema(value) {
  const type = mongoType(value);
  if (type === "array") {
    const merged = value.map(inferSchema).reduce(mergeSchemas, null);
    return { type: "array", items: merged ?? { type: "unknown" } };
  }
  if (type === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === "__proto__" || k === "constructor") continue;
      fields[k] = inferSchema(v);
    }
    return { type: "object", fields };
  }
  return { type };
}

function mergeSchemas(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.type !== b.type) {
    return { type: [a.type, b.type].flat().filter((v, i, arr) => arr.indexOf(v) === i) };
  }
  if (a.type === "object") {
    const fields = { ...a.fields };
    for (const [k, v] of Object.entries(b.fields ?? {})) {
      if (k === "__proto__" || k === "constructor") continue;
      fields[k] = fields[k] ? mergeSchemas(fields[k], v) : { ...v, optional: true };
    }
    for (const k of Object.keys(a.fields ?? {})) {
      if (k === "__proto__" || k === "constructor") continue;
      if (!(k in (b.fields ?? {}))) fields[k] = { ...fields[k], optional: true };
    }
    return { type: "object", fields };
  }
  if (a.type === "array") {
    return { type: "array", items: mergeSchemas(a.items, b.items) };
  }
  return a;
}

function prettySchema(schema, indent = 0) {
  const pad = "  ".repeat(indent);
  const pad1 = "  ".repeat(indent + 1);
  const { type, fields, items, optional } = schema;
  const optStr = optional ? " (optional)" : "";
  if (type === "object") {
    const lines = [`object${optStr} {`];
    for (const [k, v] of Object.entries(fields ?? {})) {
      lines.push(`${pad1}${k}: ${prettySchema(v, indent + 1)}`);
    }
    lines.push(`${pad}}`);
    return lines.join("\n");
  }
  if (type === "array") {
    return `array${optStr} [\n${pad1}${prettySchema(items, indent + 1)}\n${pad}]`;
  }
  if (Array.isArray(type)) return `${type.join(" | ")}${optStr}`;
  return `${type}${optStr}`;
}

const TYPE_MAP = {
  string: "String",
  number: "Number",
  boolean: "Boolean",
  Date: "Date",
  ObjectId: "mongoose.Schema.Types.ObjectId",
  Decimal128: "mongoose.Schema.Types.Decimal128",
  Long: "Number",
  Binary: "Buffer",
  null: "mongoose.Schema.Types.Mixed",
  unknown: "mongoose.Schema.Types.Mixed",
};

function toMongooseType(type) {
  if (Array.isArray(type)) {
    const nonNull = type.filter((t) => t !== "null");
    if (nonNull.length === 1) return TYPE_MAP[nonNull[0]] ?? "mongoose.Schema.Types.Mixed";
    return "mongoose.Schema.Types.Mixed";
  }
  return TYPE_MAP[type] ?? "mongoose.Schema.Types.Mixed";
}

function lcFirst(s) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function ucFirst(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function namesFromFile(filePath) {
  const base = path.basename(filePath, ".json");
  const last = base.split(/[_.\-]/).pop();
  const lower = last.toLowerCase();
  const singular = lower.endsWith("s") ? lower.slice(0, -1) : lower;
  return { modelName: ucFirst(singular), collectionName: ucFirst(lower) };
}

function buildRefRegistryFromJsonFiles(jsonFiles) {
  const registry = {};
  for (const f of jsonFiles) {
    const { modelName, collectionName } = namesFromFile(f);
    registry[modelName.toLowerCase()] = modelName;
    registry[collectionName.toLowerCase()] = modelName;
  }
  return registry;
}

function buildRefRegistryFromModelFiles(jsFiles) {
  const registry = {};
  for (const f of jsFiles) {
    const src = fs.readFileSync(f, "utf8");
    const match = src.match(/mongoose\.model\(\s*["']([^"']+)["']/);
    if (!match) continue;
    const modelName = match[1];
    const low = modelName.toLowerCase();
    const singular = low.endsWith("s") ? low.slice(0, -1) : low;
    registry[low] = modelName;
    registry[singular] = modelName;
  }
  return registry;
}

function resolveRefName(key, refRegistry = {}) {
  let lookupKey = key.toLowerCase();
  if (lookupKey.endsWith("id") && lookupKey.length > 2) {
    lookupKey = lookupKey.slice(0, -2);
  }
  return refRegistry[lookupKey] ?? "";
}

function shouldSkipField(key, options = {}) {
  return options.clean === true && (key === "_id" || key === "__v" || key === "_v");
}

function buildMongooseFields(fields, indent = 1, refRegistry = {}, options = {}) {
  const pad = "  ".repeat(indent);
  const pad1 = "  ".repeat(indent + 1);
  const lines = [];

  for (const [key, schema] of Object.entries(fields ?? {})) {
    if (shouldSkipField(key, options)) continue;
    const { type } = schema;

    if (type === "object") {
      const nested = buildMongooseFields(schema.fields, indent + 1, refRegistry, options);
      lines.push(`${pad}${key}: {\n${nested}\n${pad}}`);
      continue;
    }

    if (type === "array") {
      const itemSchema = schema.items;
      if (itemSchema?.type === "object") {
        const nested = buildMongooseFields(itemSchema.fields, indent + 2, refRegistry, options);
        lines.push(`${pad}${key}: [\n${pad1}{\n${nested}\n${pad1}}\n${pad}]`);
      } else {
        const innerType = toMongooseType(itemSchema?.type ?? "unknown");
        lines.push(`${pad}${key}: [{ type: ${innerType} }]`);
      }
      continue;
    }

    const mongooseType = toMongooseType(type);
    const isRef = mongooseType === "mongoose.Schema.Types.ObjectId" && key !== "_id";
    const fieldParts = [`type: ${mongooseType}`];
    if (isRef) {
      const resolved = resolveRefName(key, refRegistry);
      if (resolved) fieldParts.push(`ref: "${resolved}"`);
    }
    lines.push(`${pad}${key}: {\n${pad1}${fieldParts.join(`,\n${pad1}`)},\n${pad}}`);
  }

  return lines.join(",\n");
}

function generateMongooseModel(schema, modelName, refRegistry = {}, options = {}) {
  if (schema.type !== "object") throw new Error("Top-level schema must be an object.");
  const schemaVar = `${lcFirst(modelName)}Schema`;
  const fields = buildMongooseFields(schema.fields, 1, refRegistry, options);
  return `const mongoose = require("mongoose");\n\nconst ${schemaVar} = new mongoose.Schema({\n${fields}\n});\n\nmodule.exports = mongoose.model("${modelName}", ${schemaVar});\n`;
}

function buildJsObjectBody(schema, sourceExpr, indent = 1, options = {}) {
  if (!schema || schema.type !== "object") return "";
  const pad = "  ".repeat(indent);
  const lines = [];

  for (const [key, fieldSchema] of Object.entries(schema.fields ?? {})) {
    if (shouldSkipField(key, options)) continue;
    const valueExpr = buildJsValueExpr(fieldSchema, `${sourceExpr}.${key}`, indent, options);
    lines.push(`${pad}${key}: ${valueExpr}`);
  }

  return lines.join(",\n");
}

function buildJsValueExpr(schema, sourceExpr, indent, options = {}) {
  if (!schema) return sourceExpr;
  if (!options.jsDeep) return sourceExpr;

  if (schema.type === "object") {
    const body = buildJsObjectBody(schema, sourceExpr, indent + 1, options);
    const pad = "  ".repeat(indent);
    return `{\n${body}\n${pad}}`;
  }

  if (schema.type === "array") {
    const itemSchema = schema.items ?? { type: "unknown" };
    if (itemSchema.type === "object") {
      const itemVar = "item";
      const body = buildJsObjectBody(itemSchema, itemVar, indent + 2, options);
      const pad1 = "  ".repeat(indent + 1);
      return `${sourceExpr}?.map((${itemVar}) => ({\n${body}\n${pad1}})) ?? []`;
    }
  }

  return sourceExpr;
}

function generateDbJsTemplate(entries, options = {}) {
  const blocks = [];

  for (const entry of entries) {
    const listName = `${lcFirst(entry.collectionName)}List`;
    const resName = `${lcFirst(entry.collectionName)}ResData`;
    const body = buildJsObjectBody(entry.schema, "i", 2, options);
    blocks.push(`const ${resName} = ${listName}.map((i) => ({\n${body}\n}));`);
  }

  return `${blocks.join("\n\n")}\n`;
}

function collectPopulatePaths(schema, refRegistry = {}, prefix = "") {
  if (!schema || schema.type !== "object") return [];
  const paths = [];

  for (const [key, fieldSchema] of Object.entries(schema.fields ?? {})) {
    const fullPath = prefix ? `${prefix}.${key}` : key;

    if (fieldSchema.type === "object") {
      paths.push(...collectPopulatePaths(fieldSchema, refRegistry, fullPath));
      continue;
    }

    if (fieldSchema.type === "array") {
      if (fieldSchema.items?.type === "object") {
        paths.push(...collectPopulatePaths(fieldSchema.items, refRegistry, fullPath));
      }
      continue;
    }

    if (toMongooseType(fieldSchema.type) === "mongoose.Schema.Types.ObjectId" && key !== "_id") {
      const resolved = resolveRefName(key, refRegistry);
      if (resolved) paths.push(fullPath);
    }
  }

  return [...new Set(paths)];
}

function toRequirePath(fromDir, targetFile) {
  let rel = path.relative(fromDir, targetFile).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel.replace(/\.js$/i, "");
}

function buildPopulateChain(schema, refRegistry = {}, options = {}) {
  if (!options.populate) return "";
  return collectPopulatePaths(schema, refRegistry)
    .map((field) => `.populate("${field}")`)
    .join("");
}

function buildSelectedCrudOps(mode) {
  return mode === "all" ? CRUD_MODES.filter((i) => i !== "all") : [mode];
}

function generateMapHelper(modelName, schema, options = {}) {
  const helperName = `map${modelName}`;
  const body = buildJsObjectBody(schema, "i", 1, options);
  return `const ${helperName} = (i) => ({\n${body}\n});\n`;
}

function generateCrudHandler(op, context) {
  const {
    modelName,
    pluralLabel,
    helperName,
    populateChain,
  } = context;

  if (op === "find") {
    return `const find${pluralLabel} = async (req, res) => {\n  try {\n    const list = await ${modelName}.find()${populateChain}.catch(() => null);\n\n    // Uncomment if you want an empty list to return 404.\n    // if (!list || list.length === 0) {\n    //   return res.status(404).json({ message: "${modelName} not found" });\n    // }\n\n    return res.status(200).json((list ?? []).map(${helperName}));\n  } catch {\n    return res.status(500).json({ message: "Server error" });\n  }\n};\n`;
  }

  if (op === "findById") {
    return `const find${modelName}ById = async (req, res) => {\n  try {\n    const item = await ${modelName}.findById(req.params.id)${populateChain}.catch(() => null);\n\n    if (!item) {\n      return res.status(404).json({ message: "${modelName} not found" });\n    }\n\n    return res.status(200).json(${helperName}(item));\n  } catch {\n    return res.status(500).json({ message: "Server error" });\n  }\n};\n`;
  }

  if (op === "create") {
    return `const create${modelName} = async (req, res) => {\n  try {\n    const created = await ${modelName}.create(req.body).catch(() => null);\n\n    if (!created) {\n      return res.status(400).json({ message: "Create failed" });\n    }\n\n    return res.status(201).json(${helperName}(created));\n  } catch {\n    return res.status(500).json({ message: "Server error" });\n  }\n};\n`;
  }

  if (op === "updateById") {
    return `const update${modelName}ById = async (req, res) => {\n  try {\n    const updated = await ${modelName}.findByIdAndUpdate(req.params.id, req.body, {\n      new: true,\n      runValidators: true,\n    })${populateChain}.catch(() => null);\n\n    if (!updated) {\n      return res.status(404).json({ message: "${modelName} not found" });\n    }\n\n    return res.status(200).json(${helperName}(updated));\n  } catch {\n    return res.status(500).json({ message: "Server error" });\n  }\n};\n`;
  }

  return `const delete${modelName}ById = async (req, res) => {\n  try {\n    const deleted = await ${modelName}.findByIdAndDelete(req.params.id).catch(() => null);\n\n    if (!deleted) {\n      return res.status(404).json({ message: "${modelName} not found" });\n    }\n\n    return res.status(200).json({ message: "${modelName} deleted successfully" });\n  } catch {\n    return res.status(500).json({ message: "Server error" });\n  }\n};\n`;
}

function generateCrudRoutes(modelName, pluralLabel, selectedOps) {
  const lines = [];
  if (selectedOps.includes("find")) lines.push(`router.get("/", find${pluralLabel});`);
  if (selectedOps.includes("findById")) lines.push(`router.get("/:id", find${modelName}ById);`);
  if (selectedOps.includes("create")) lines.push(`router.post("/", create${modelName});`);
  if (selectedOps.includes("updateById")) lines.push(`router.put("/:id", update${modelName}ById);`);
  if (selectedOps.includes("deleteById")) lines.push(`router.delete("/:id", delete${modelName}ById);`);
  return lines.join("\n");
}

function generateMongooseCrudFile(schema, modelName, collectionName, modelFilePath, refRegistry = {}, options = {}) {
  const selectedOps = buildSelectedCrudOps(options.mongooseMode);
  const pluralLabel = collectionName;
  const helperName = `map${modelName}`;
  const populateChain = buildPopulateChain(schema, refRegistry, options);
  const modelRequirePath = toRequirePath(options.mongooseDir, modelFilePath);
  const handlers = selectedOps.map((op) =>
    generateCrudHandler(op, { modelName, pluralLabel, helperName, populateChain })
  ).join("\n");
  const routes = generateCrudRoutes(modelName, pluralLabel, selectedOps);

  return `const express = require("express");\nconst ${modelName} = require("${modelRequirePath}");\n\nconst router = express.Router();\nrouter.use(express.json());\n\n${generateMapHelper(modelName, schema, options)}\n${handlers}\n${routes}\n\nmodule.exports = router;\n`;
}

function extractIdValue(value) {
  if (value && typeof value === "object") {
    if (typeof value.$oid === "string") return value.$oid;
    if (typeof value.$numberLong === "string") return value.$numberLong;
  }
  if (typeof value === "string" || typeof value === "number") return String(value);
  return null;
}

function createInvalidId(validId, allIds) {
  if (!validId) return "invalid_id";
  if (/^[a-fA-F0-9]{24}$/.test(validId)) {
    if (!allIds.has("000000000000000000000000")) return "000000000000000000000000";
    if (!allIds.has("ffffffffffffffffffffffff")) return "ffffffffffffffffffffffff";
  }
  let invalidId = `invalid_${validId}`;
  while (allIds.has(invalidId)) invalidId = `invalid_${invalidId}`;
  return invalidId;
}

function generateIdList(entries) {
  const lines = [];

  for (const entry of entries) {
    const allIds = new Set(entry.docs.map((doc) => extractIdValue(doc?._id)).filter(Boolean));
    const validId = [...allIds][0] ?? "N/A";
    const invalidId = createInvalidId(validId === "N/A" ? null : validId, allIds);
    lines.push(entry.modelName);
    lines.push(`valid_id: ${validId}`);
    lines.push(`invalid_id: ${invalidId}`);
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

function promptDatabaseName() {
  const shell = process.env.SHELL || "/bin/zsh";
  const result = spawnSync(shell, ["-lc", 'printf "Database name: " 1>&2; read -r dbName; printf "%s" "$dbName"'], {
    stdio: ["inherit", "pipe", "inherit"],
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error("Failed to read database name.");
  }

  const dbName = (result.stdout || "").trim();
  if (!dbName) {
    throw new Error("Database name is required for --upload.");
  }

  return dbName;
}

function promptMongoUri() {
  const shell = process.env.SHELL || "/bin/zsh";
  const result = spawnSync(shell, ["-lc", 'printf "Mongo URI: " 1>&2; read -r mongoUri; printf "%s" "$mongoUri"'], {
    stdio: ["inherit", "pipe", "inherit"],
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error("Failed to read Mongo URI.");
  }

  const mongoUri = (result.stdout || "").trim();
  if (!mongoUri) {
    throw new Error("Mongo URI is required for --upload-custom.");
  }

  return mongoUri;
}

function extractDatabaseNameFromUri(uri) {
  const cleanUri = String(uri || "").split("?")[0].replace(/\/+$/, "");
  const idx = cleanUri.lastIndexOf("/");
  if (idx === -1) return "";
  return cleanUri.slice(idx + 1);
}

function uploadJsonFiles(uploadEntries, mongoUri, databaseName) {
  for (const entry of uploadEntries) {
    let result = spawnSync("mongoimport", [
      "--uri",
      mongoUri,
      "--collection",
      entry.collectionName,
      "--file",
      entry.jsonFile,
      "--jsonArray",
    ], {
      encoding: "utf8",
    });

    if (result.error && result.error.code === "ENOENT") {
      const rawJson = fs.readFileSync(entry.jsonFile, "utf8");
      const mongoScript = [
        `const docs = EJSON.parse(${JSON.stringify(rawJson)});`,
        `const collection = db.getSiblingDB(${JSON.stringify(databaseName)}).getCollection(${JSON.stringify(entry.collectionName)});`,
        "collection.deleteMany({});",
        "if (docs.length) collection.insertMany(docs);",
      ].join(" ");

      result = spawnSync("mongosh", [
        mongoUri,
        "--quiet",
        "--eval",
        mongoScript,
      ], {
        encoding: "utf8",
      });
    }

    if (result.status !== 0) {
      const stderr = (result.stderr || "").trim();
      throw new Error(`Upload failed for ${entry.collectionName}: ${stderr || "mongoimport exited with an error."}`);
    }

    console.log(`Uploaded ${path.basename(entry.jsonFile)} -> ${databaseName}.${entry.collectionName}`);
  }

  console.log("\n// env:");
  console.log(`MONGO_URI=${mongoUri}`);
}

const args = process.argv.slice(2);
const scriptName = path.basename(process.argv[1] || "jsonToModel.js");

function getFlag(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
}

function getMultiFlag(flag) {
  const idx = args.indexOf(flag);
  if (idx === -1) return [];
  const values = [];
  for (let i = idx + 1; i < args.length; i++) {
    if (args[i].startsWith("--")) break;
    values.push(args[i]);
  }
  return values;
}

const mongooseFlag = getFlag("--mongoose");
const mongooseMode = CRUD_MODES.includes(mongooseFlag) ? mongooseFlag : null;
const isAuto = args.includes("--auto");
const isAutoRef = args.includes("--auto-ref");
const isBatch = args.includes("--batch");
const isNote = args.includes("--note");
const isClean = args.includes("--clean");
const isJs = args.includes("--js");
const isJsDeep = args.includes("--js-deep");
const isPopulate = args.includes("--populate");
const isIdList = args.includes("--id-list");
const isUpload = args.includes("--upload");
const isUploadCustome = args.includes("--upload-custom");
const shouldWriteJs = isJs || isJsDeep;
let batchFiles = isBatch ? getMultiFlag("--batch") : [];
let outDir = getFlag("--output") ?? getFlag("--outdir");

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(`
JSON_TO_MODEL
Usage: node ${scriptName} [options]

Options:
  --auto                         Automatically discover and process all .json files.
  --auto-ref                     Automatically discover and process all .json files with reference support.
  --batch <file1> <file2> ...    Process multiple specified .json files.
  --input, --db-dir, -db-dir     Input directory for --auto or --auto-ref mode.
  --output, --outdir             Output directory for generated model files.
  --clean                        Remove _id, _v, and __v from generated model fields.
  --js                           Generate db.js with shallow map templates.
  --js-deep                      Generate db.js with nested object/array mapping.
  --populate                     Add populate(...) to generated CRUD queries when refs are detected.
  --id-list                      Generate id.txt with valid_id and invalid_id samples.
  --upload                       Upload JSON files to local MongoDB after generation.
  --upload-custom               Upload JSON files to a custom MongoDB URI after generation.
  --note                         Generate db.txt schema notes.
  --mongoose <file|mode>         Single-file model output path, or CRUD mode: all|find|findById|create|updateById|deleteById.
  --help, -h                     Show this help.

Single File Mode:
  <input.json>                   JSON file to infer schema from.
  --model <Name>                 Model name to generate.
  --out <schema.json>            Save inferred schema JSON.
  --refs <A.js> <B.js>           Existing model files to resolve refs.

Examples:
  node ${scriptName} --auto-ref --clean --js-deep --populate --id-list --upload --input . --output ./models --mongoose all
  node ${scriptName} --auto-ref --upload-custom --input . --output ./models
  node ${scriptName} --batch users.json events.json --outdir ./models --mongoose find
  node ${scriptName} users.json --model User --mongoose User.js
`);
  process.exit(0);
}

if (isAuto || isAutoRef || isBatch) {
  let selectedDir = ".";

  if (isAuto || isAutoRef) {
    const autoInputDir = getFlag("--input") ?? getFlag("-db-dir") ?? getFlag("--db-dir") ?? ".";
    selectedDir = autoInputDir;
    outDir = outDir ?? path.join(autoInputDir, "models");
    if (!fs.existsSync(autoInputDir)) {
      console.error(`Error: Input directory not found: ${autoInputDir}`);
      process.exit(1);
    }
    batchFiles = fs.readdirSync(autoInputDir)
      .filter((f) => f.toLowerCase().endsWith(".json"))
      .map((f) => path.join(autoInputDir, f));
    if (!batchFiles.length) {
      console.error(`No .json files found in directory: ${autoInputDir}`);
      process.exit(1);
    }
  } else {
    const fixedBatchFiles = [];
    for (const bf of batchFiles) {
      if (bf.includes(".json/")) fixedBatchFiles.push(...bf.split(/(?<=\.json)(?=\/)/i));
      else fixedBatchFiles.push(bf);
    }
    batchFiles = fixedBatchFiles;
    if (!batchFiles.length) {
      console.error(`Usage: node ${scriptName} --batch file1.json file2.json ... [--output ./models]`);
      process.exit(1);
    }
    outDir = outDir ?? ".";
  }

  const refRegistry = isAutoRef ? buildRefRegistryFromJsonFiles(batchFiles) : {};
  const mongooseDir = path.join(selectedDir, "mongoose");
  const dbJsEntries = [];
  const idEntries = [];
  const uploadEntries = [];
  const dbNotes = [];

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  if (mongooseMode && !fs.existsSync(mongooseDir)) fs.mkdirSync(mongooseDir, { recursive: true });

  for (const jsonFile of batchFiles) {
    const { modelName, collectionName } = namesFromFile(jsonFile);
    const raw = fs.readFileSync(jsonFile, "utf8");
    const docs = JSON.parse(raw);

    if (!Array.isArray(docs)) {
      console.error(`Skipping ${jsonFile}: expected a JSON array.`);
      continue;
    }

    const schema = docs.map(inferSchema).reduce(mergeSchemas);
    const modelCode = generateMongooseModel(schema, modelName, refRegistry, { clean: isClean });
    const modelFilePath = path.join(outDir, `${collectionName.toLowerCase()}.js`);
    fs.writeFileSync(modelFilePath, modelCode, "utf8");

    dbJsEntries.push({ schema, modelName, collectionName });
    idEntries.push({ docs, modelName });
    uploadEntries.push({ jsonFile, collectionName: collectionName.toLowerCase() });

    if (isNote) {
      dbNotes.push(`=== ${modelName} ===`);
      dbNotes.push(prettySchema(schema));
      dbNotes.push("");
    }

    if (mongooseMode) {
      const crudCode = generateMongooseCrudFile(schema, modelName, collectionName, modelFilePath, refRegistry, {
        clean: isClean,
        jsDeep: isJsDeep,
        populate: isPopulate,
        mongooseMode,
        mongooseDir,
      });
      const crudFilePath = path.join(mongooseDir, `${collectionName.toLowerCase()}.js`);
      fs.writeFileSync(crudFilePath, crudCode, "utf8");
      console.log(`Generated mongoose route: ${crudFilePath}`);
    }

    console.log(`Written model: ${modelFilePath}`);
  }

  if (isNote) {
    const notePath = path.join(selectedDir, "db.txt");
    fs.writeFileSync(notePath, dbNotes.join("\n"), "utf8");
    console.log(`Written schema notes: ${notePath}`);
  }

  if (shouldWriteJs) {
    const dbJsPath = path.join(selectedDir, "db.js");
    fs.writeFileSync(dbJsPath, generateDbJsTemplate(dbJsEntries, { clean: isClean, jsDeep: isJsDeep }), "utf8");
    console.log(`Written db.js: ${dbJsPath}`);
  }

  if (isIdList) {
    const idPath = path.join(selectedDir, "id.txt");
    fs.writeFileSync(idPath, generateIdList(idEntries), "utf8");
    console.log(`Written id list: ${idPath}`);
  }

  if (isUpload || isUploadCustome) {
    const databaseName = promptDatabaseName();
    const mongoUri = isUploadCustome
      ? promptMongoUri()
      : `mongodb://127.0.0.1:27017/${databaseName}`;
    uploadJsonFiles(uploadEntries, mongoUri, databaseName);
  }

  process.exit(0);
}

const refsFiles = getMultiFlag("--refs");
const inputFile = args.find((a) =>
  !a.startsWith("--") &&
  !refsFiles.includes(a) &&
  args[args.indexOf(a) - 1] !== "--out" &&
  args[args.indexOf(a) - 1] !== "--model" &&
  args[args.indexOf(a) - 1] !== "--mongoose"
);
const outputFile = getFlag("--out");
const mongooseFile = mongooseMode ? null : mongooseFlag;

if (!inputFile) {
  console.error([
    `Single: node ${scriptName} <input.json> [--model Name] [--out schema.json] [--mongoose Model.js] [--refs A.js B.js]`,
    `Batch:  node ${scriptName} --auto-ref --input . --output ./models [--mongoose all]`,
  ].join("\n"));
  process.exit(1);
}

const { modelName: inferredModel, collectionName } = namesFromFile(inputFile);
const modelName = getFlag("--model") ?? inferredModel;
const refRegistry = refsFiles.length ? buildRefRegistryFromModelFiles(refsFiles) : {};
const raw = fs.readFileSync(inputFile, "utf8");
const docs = JSON.parse(raw);

if (!Array.isArray(docs)) {
  console.error("Expected a JSON array of documents.");
  process.exit(1);
}

const schema = docs.map(inferSchema).reduce(mergeSchemas);

console.log("\n=== Inferred Schema ===\n");
console.log(prettySchema(schema));

if (outputFile) {
  fs.writeFileSync(outputFile, JSON.stringify(schema, null, 2), "utf8");
  console.log(`JSON schema written to: ${outputFile}`);
}

if (mongooseFile) {
  const modelCode = generateMongooseModel(schema, modelName, refRegistry, { clean: isClean });
  fs.writeFileSync(mongooseFile, modelCode, "utf8");
  console.log(`Mongoose model written to: ${mongooseFile}`);
}

if (mongooseMode) {
  const selectedDir = path.dirname(path.resolve(inputFile));
  const mongooseDir = path.join(selectedDir, "mongoose");
  if (!fs.existsSync(mongooseDir)) fs.mkdirSync(mongooseDir, { recursive: true });
  const modelFilePath = path.join(selectedDir, "models", `${collectionName.toLowerCase()}.js`);
  const crudCode = generateMongooseCrudFile(schema, modelName, collectionName, modelFilePath, refRegistry, {
    clean: isClean,
    jsDeep: isJsDeep,
    populate: isPopulate,
    mongooseMode,
    mongooseDir,
  });
  const crudFilePath = path.join(mongooseDir, `${collectionName.toLowerCase()}.js`);
  fs.writeFileSync(crudFilePath, crudCode, "utf8");
  console.log(`Mongoose CRUD file written to: ${crudFilePath}`);
}

if (shouldWriteJs) {
  const dbJsPath = path.join(path.dirname(path.resolve(inputFile)), "db.js");
  fs.writeFileSync(dbJsPath, generateDbJsTemplate([{ schema, modelName, collectionName }], { clean: isClean, jsDeep: isJsDeep }), "utf8");
  console.log(`db.js written to: ${dbJsPath}`);
}

if (isIdList) {
  const idPath = path.join(path.dirname(path.resolve(inputFile)), "id.txt");
  fs.writeFileSync(idPath, generateIdList([{ docs, modelName }]), "utf8");
  console.log(`id.txt written to: ${idPath}`);
}

if (isUpload || isUploadCustome) {
  const databaseName = promptDatabaseName();
  const mongoUri = isUploadCustome
    ? promptMongoUri()
    : `mongodb://127.0.0.1:27017/${databaseName}`;
  uploadJsonFiles([{ jsonFile: path.resolve(inputFile), collectionName: collectionName.toLowerCase() }], mongoUri, databaseName);
}

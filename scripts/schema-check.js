/**
 * schema-check.js — 외부 패키지 없이 JSON Schema 일부 키워드(type·required·enum·const·pattern·items·
 * min/maxLength·minItems·maxItems·minimum·maximum·properties·additionalProperties(false 또는 스키마)·allOf/if/then·anyOf·$ref)만 해석하는 검사기.
 * scripts/schema.js가 쓴다.
 *
 *   const { check } = require("./schema-check.js"); const errs = []; check(schema, value, "$", schema, errs);
 */
const typeOk = (t, v) =>
  t === "array" ? Array.isArray(v)
  : t === "object" ? v !== null && typeof v === "object" && !Array.isArray(v)
  : t === "integer" ? Number.isInteger(v)
  : typeof v === t;

function check(schema, v, at, root, errs) {
  if (schema.$ref) schema = schema.$ref.split("/").slice(1).reduce((s, k) => s[k], root);
  if (schema.const !== undefined && v !== schema.const) errs.push(`${at}: ${JSON.stringify(schema.const)} 이어야 함`);
  if (schema.enum && !schema.enum.includes(v)) errs.push(`${at}: ${schema.enum.join("|")} 중 하나여야 함 (지금 ${JSON.stringify(v)})`);
  if (schema.type && !typeOk(schema.type, v)) return errs.push(`${at}: ${schema.type} 이어야 함`);
  if (typeof v === "string") {
    if (schema.pattern && !new RegExp(schema.pattern).test(v)) errs.push(`${at}: 형식 불일치 (${schema.pattern})`);
    if (schema.minLength && v.length < schema.minLength) errs.push(`${at}: 너무 짧음`);
    if (schema.maxLength && v.length > schema.maxLength) errs.push(`${at}: ${schema.maxLength}자 초과`);
  }
  if (typeof v === "number" && schema.minimum !== undefined && v < schema.minimum) errs.push(`${at}: ${schema.minimum} 이상이어야 함`);
  if (typeof v === "number" && schema.maximum !== undefined && v > schema.maximum) errs.push(`${at}: ${schema.maximum} 이하여야 함`);
  if (schema.anyOf) {
    const tries = schema.anyOf.map((s) => { const e = []; check(s, v, at, root, e); return e; });
    if (!tries.some((e) => !e.length)) errs.push(`${at}: 허용 형식 중 어느 것과도 맞지 않음 — ${tries.map((e) => e[0]).join(" / ")}`);
  }
  if (Array.isArray(v)) {
    if (schema.minItems && v.length < schema.minItems) errs.push(`${at}: 항목 ${schema.minItems}개 이상 필요`);
    if (schema.maxItems !== undefined && v.length > schema.maxItems) errs.push(`${at}: 항목 ${schema.maxItems}개 이하`);
    if (schema.items) v.forEach((x, i) => check(schema.items, x, `${at}[${i}]`, root, errs));
  }
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const k of schema.required || []) if (!(k in v)) errs.push(`${at}.${k}: 필수 항목 없음`);
    const props = schema.properties || {};
    for (const [k, x] of Object.entries(v)) {
      if (props[k]) check(props[k], x, `${at}.${k}`, root, errs);
      else if (schema.additionalProperties === false) errs.push(`${at}.${k}: 스키마에 없는 항목`);
      else if (typeof schema.additionalProperties === "object") check(schema.additionalProperties, x, `${at}.${k}`, root, errs);
    }
  }
  for (const rule of schema.allOf || []) {
    const probe = [];
    check(rule.if, v, at, root, probe);
    if (!probe.length && rule.then) check(rule.then, v, at, root, errs);
  }
}

module.exports = { check, typeOk };

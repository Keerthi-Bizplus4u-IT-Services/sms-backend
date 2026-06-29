#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DEFAULT_FILE = 'TENANT_POLICY_MATRIX.md';
const DEFAULT_PRIORITIES = ['P0'];
const DEFAULT_RULES = [
  { column: 'Service Scope Enforced', expected: 'yes' },
  { column: 'Negative Test', expected: 'yes' }
];

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function parseArg(name, fallback) {
  const prefix = `--${name}=`;
  const match = process.argv.find(arg => arg.startsWith(prefix));
  if (!match) return fallback;
  return match.slice(prefix.length);
}

function parseListArg(name, fallback) {
  const value = parseArg(name, null);
  if (!value) return fallback;
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function parseRules() {
  const columns = parseListArg('columns', DEFAULT_RULES.map(rule => rule.column));
  const expected = parseListArg('expected', DEFAULT_RULES.map(rule => rule.expected));

  if (columns.length !== expected.length) {
    throw new Error('The number of --columns and --expected values must match.');
  }

  return columns.map((column, index) => ({
    column,
    expected: expected[index]
  }));
}

function splitTableLine(line) {
  return line
    .trim()
    .split('|')
    .slice(1, -1)
    .map(cell => cell.trim());
}

function isDividerLine(line) {
  return /^\|(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(line.trim());
}

function parseMarkdownTables(markdown) {
  const lines = markdown.split(/\r?\n/);
  const tables = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line || !line.trim().startsWith('|')) {
      i += 1;
      continue;
    }

    const headerLine = line;
    const dividerLine = lines[i + 1] || '';

    if (!isDividerLine(dividerLine)) {
      i += 1;
      continue;
    }

    const headers = splitTableLine(headerLine);
    const rows = [];

    i += 2;
    while (i < lines.length && lines[i].trim().startsWith('|')) {
      const rowLine = lines[i];
      if (!isDividerLine(rowLine)) {
        const cells = splitTableLine(rowLine);
        if (cells.length === headers.length) {
          const row = {};
          headers.forEach((header, index) => {
            row[header] = cells[index];
          });
          rows.push(row);
        }
      }
      i += 1;
    }

    tables.push({ headers, rows });
  }

  return tables;
}

function evaluateRows(rows, priorities, rules) {
  const failures = [];

  rows.forEach((row, rowIndex) => {
    const priorityValue = normalize(row.Priority);
    if (!priorityValue || !priorities.includes(priorityValue.toUpperCase())) {
      return;
    }

    rules.forEach(rule => {
      const actual = normalize(row[rule.column]);
      const expected = normalize(rule.expected);

      if (actual !== expected) {
        failures.push({
          rowIndex,
          domain: row.Domain || 'unknown',
          method: row.Method || '-',
          path: row.Path || '-',
          priority: row.Priority || '-',
          status: row.Status || '-',
          column: rule.column,
          expected: rule.expected,
          actual: row[rule.column] || '(missing)'
        });
      }
    });
  });

  return failures;
}

function main() {
  const fileArg = parseArg('file', DEFAULT_FILE);
  const matrixPath = path.resolve(process.cwd(), fileArg);
  const priorities = parseListArg('priorities', DEFAULT_PRIORITIES).map(item => item.toUpperCase());
  const rules = parseRules();

  if (!fs.existsSync(matrixPath)) {
    throw new Error(`Matrix file not found: ${matrixPath}`);
  }

  const markdown = fs.readFileSync(matrixPath, 'utf8');
  const tables = parseMarkdownTables(markdown);

  let totalRows = 0;
  const allFailures = [];

  tables.forEach(table => {
    const hasPriority = table.headers.includes('Priority');
    const hasAllRuleColumns = rules.every(rule => table.headers.includes(rule.column));

    if (!hasPriority || !hasAllRuleColumns) {
      return;
    }

    totalRows += table.rows.length;
    const failures = evaluateRows(table.rows, priorities, rules);
    allFailures.push(...failures);
  });

  if (!totalRows) {
    console.log('No eligible policy table rows found to evaluate.');
    process.exit(0);
  }

  if (!allFailures.length) {
    console.log(`Tenant policy gate passed for priorities: ${priorities.join(', ')}`);
    process.exit(0);
  }

  console.error('Tenant policy gate failed.');
  allFailures.forEach(failure => {
    console.error(
      `- [${failure.priority}] ${failure.domain} ${failure.method} ${failure.path} (status: ${failure.status}) -> ${failure.column} expected "${failure.expected}" but got "${failure.actual}"`
    );
  });

  process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(`Tenant policy gate error: ${error.message}`);
  process.exit(1);
}

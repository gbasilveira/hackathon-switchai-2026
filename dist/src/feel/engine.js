/**
 * SwitchCortex — Clean-Room FEEL (Friendly Enough Expression Language, DMN 1.3) Engine
 *
 * Provides deterministic, side-effect-free, budget-bounded parsing, evaluation,
 * unary-test evaluation, and static variable/domain extraction for DMN 1.3 & BPMN 2.0.
 * Zero eval() or dynamic code generation.
 */
export class FeelError extends Error {
    code;
    position;
    constructor(code, message, position) {
        super(message);
        this.name = 'FeelError';
        this.code = code;
        this.position = position;
    }
}
const FORBIDDEN_SEGMENTS = new Set([
    '__proto__',
    'prototype',
    'constructor',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__',
]);
export function tokenizeFeel(input) {
    const tokens = [];
    let i = 0;
    const len = input.length;
    while (i < len) {
        const ch = input[i];
        if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
            i++;
            continue;
        }
        if (ch === '.' && input[i + 1] === '.') {
            tokens.push({ type: 'dots', value: '..', pos: i });
            i += 2;
            continue;
        }
        if ((ch === '<' && input[i + 1] === '=') ||
            (ch === '>' && input[i + 1] === '=') ||
            (ch === '!' && input[i + 1] === '=') ||
            (ch === '<' && input[i + 1] === '>') ||
            (ch === '=' && input[i + 1] === '=')) {
            const raw = input.slice(i, i + 2);
            const normalized = raw === '<>' ? '!=' : raw === '==' ? '=' : raw;
            tokens.push({ type: 'op', value: normalized, pos: i });
            i += 2;
            continue;
        }
        if (ch === '=' || ch === '<' || ch === '>' || ch === '+' || ch === '-' || ch === '*' || ch === '/') {
            tokens.push({ type: 'op', value: ch, pos: i });
            i++;
            continue;
        }
        if (ch === '(' || ch === ')' || ch === '[' || ch === ']' || ch === ',' || ch === '.') {
            tokens.push({ type: 'punct', value: ch, pos: i });
            i++;
            continue;
        }
        if (ch === '"' || ch === "'") {
            const quote = ch;
            const start = i;
            i++;
            let str = '';
            while (i < len && input[i] !== quote) {
                if (input[i] === '\\' && i + 1 < len) {
                    i++;
                    const esc = input[i];
                    str += esc === 'n' ? '\n' : esc === 't' ? '\t' : esc;
                }
                else {
                    str += input[i];
                }
                i++;
            }
            if (i >= len) {
                throw new FeelError('ERR_UNTERMINATED_STRING', `Unterminated string at position ${start}`, start);
            }
            i++; // closing quote
            tokens.push({ type: 'string', value: str, pos: start });
            continue;
        }
        if (ch >= '0' && ch <= '9') {
            const start = i;
            while (i < len && input[i] >= '0' && input[i] <= '9') {
                i++;
            }
            if (i < len && input[i] === '.' && input[i + 1] !== '.') {
                i++;
                while (i < len && input[i] >= '0' && input[i] <= '9') {
                    i++;
                }
            }
            tokens.push({ type: 'number', value: input.slice(start, i), pos: start });
            continue;
        }
        if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
            const start = i;
            while (i < len &&
                ((input[i] >= 'a' && input[i] <= 'z') ||
                    (input[i] >= 'A' && input[i] <= 'Z') ||
                    (input[i] >= '0' && input[i] <= '9') ||
                    input[i] === '_')) {
                i++;
            }
            const word = input.slice(start, i);
            if (word === 'true' || word === 'false') {
                tokens.push({ type: 'boolean', value: word, pos: start });
            }
            else if (word === 'null') {
                tokens.push({ type: 'null', value: word, pos: start });
            }
            else if (word === 'and' || word === 'or' || word === 'not' || word === 'in') {
                tokens.push({ type: 'op', value: word, pos: start });
            }
            else {
                tokens.push({ type: 'ident', value: word, pos: start });
            }
            continue;
        }
        throw new FeelError('ERR_UNEXPECTED_CHAR', `Unexpected character '${ch}' at position ${i}`, i);
    }
    tokens.push({ type: 'eof', value: '', pos: i });
    return tokens;
}
class Parser {
    tokens;
    idx = 0;
    constructor(tokens) {
        this.tokens = tokens;
    }
    peek(offset = 0) {
        return this.tokens[Math.min(this.idx + offset, this.tokens.length - 1)];
    }
    consume(expectedType, expectedValue) {
        const tok = this.peek();
        if (expectedType && tok.type !== expectedType) {
            throw new FeelError('ERR_SYNTAX', `Expected token type ${expectedType} but got ${tok.type} ('${tok.value}') at position ${tok.pos}`, tok.pos);
        }
        if (expectedValue !== undefined && tok.value !== expectedValue) {
            throw new FeelError('ERR_SYNTAX', `Expected '${expectedValue}' but got '${tok.value}' at position ${tok.pos}`, tok.pos);
        }
        this.idx++;
        return tok;
    }
    parseExpression() {
        return this.parseOr();
    }
    parseOr() {
        let left = this.parseAnd();
        while (this.peek().type === 'op' && this.peek().value === 'or') {
            this.consume();
            const right = this.parseAnd();
            left = { kind: 'binary', op: 'or', left, right };
        }
        return left;
    }
    parseAnd() {
        let left = this.parseComparison();
        while (this.peek().type === 'op' && this.peek().value === 'and') {
            this.consume();
            const right = this.parseComparison();
            left = { kind: 'binary', op: 'and', left, right };
        }
        return left;
    }
    parseComparison() {
        let left = this.parseAdditive();
        const tok = this.peek();
        if (tok.type === 'op' &&
            (tok.value === '=' ||
                tok.value === '!=' ||
                tok.value === '<' ||
                tok.value === '<=' ||
                tok.value === '>' ||
                tok.value === '>=' ||
                tok.value === 'in')) {
            const op = this.consume().value;
            if (op === 'in' && this.peek().type === 'punct' && (this.peek().value === '(' || this.peek().value === '[')) {
                const right = this.parseIntervalOrList();
                return { kind: 'binary', op: 'in', left, right };
            }
            const right = this.parseAdditive();
            left = { kind: 'binary', op, left, right };
        }
        return left;
    }
    parseAdditive() {
        let left = this.parseMultiplicative();
        while (this.peek().type === 'op' && (this.peek().value === '+' || this.peek().value === '-')) {
            const op = this.consume().value;
            const right = this.parseMultiplicative();
            left = { kind: 'binary', op, left, right };
        }
        return left;
    }
    parseMultiplicative() {
        let left = this.parseUnary();
        while (this.peek().type === 'op' && (this.peek().value === '*' || this.peek().value === '/')) {
            const op = this.consume().value;
            const right = this.parseUnary();
            left = { kind: 'binary', op, left, right };
        }
        return left;
    }
    parseUnary() {
        const tok = this.peek();
        if (tok.type === 'op' && tok.value === '-') {
            this.consume();
            return { kind: 'unary', op: '-', operand: this.parseUnary() };
        }
        if (tok.type === 'op' && tok.value === 'not') {
            this.consume();
            if (this.peek().type === 'punct' && this.peek().value === '(') {
                this.consume('punct', '(');
                const inner = this.parseExpression();
                this.consume('punct', ')');
                return { kind: 'unary', op: 'not', operand: inner };
            }
            return { kind: 'unary', op: 'not', operand: this.parseUnary() };
        }
        return this.parsePrimary();
    }
    parseIntervalOrList() {
        const open = this.peek();
        if (open.type === 'punct' && (open.value === '[' || open.value === '(')) {
            const savedIdx = this.idx;
            try {
                this.consume();
                const startExpr = this.parseAdditive();
                if (this.peek().type === 'dots') {
                    this.consume('dots');
                    const endExpr = this.parseAdditive();
                    const close = this.consume('punct');
                    if (close.value !== ']' && close.value !== ')') {
                        throw new FeelError('ERR_INTERVAL_CLOSE', `Invalid interval closing '${close.value}'`, close.pos);
                    }
                    return {
                        kind: 'interval',
                        start: startExpr,
                        end: endExpr,
                        startInclusive: open.value === '[',
                        endInclusive: close.value === ']',
                    };
                }
            }
            catch {
                // Fallback to list or grouped expression
            }
            this.idx = savedIdx;
        }
        if (open.type === 'punct' && open.value === '[') {
            this.consume('punct', '[');
            const items = [];
            if (!(this.peek().type === 'punct' && this.peek().value === ']')) {
                items.push(this.parseExpression());
                while (this.peek().type === 'punct' && this.peek().value === ',') {
                    this.consume('punct', ',');
                    items.push(this.parseExpression());
                }
            }
            this.consume('punct', ']');
            return { kind: 'list', items };
        }
        if (open.type === 'punct' && open.value === '(') {
            this.consume('punct', '(');
            const first = this.parseExpression();
            if (this.peek().type === 'punct' && this.peek().value === ',') {
                const items = [first];
                while (this.peek().type === 'punct' && this.peek().value === ',') {
                    this.consume('punct', ',');
                    items.push(this.parseExpression());
                }
                this.consume('punct', ')');
                return { kind: 'list', items };
            }
            this.consume('punct', ')');
            return first;
        }
        return this.parsePrimary();
    }
    parsePrimary() {
        const tok = this.peek();
        if (tok.type === 'number') {
            this.consume();
            const num = Number(tok.value);
            if (!Number.isFinite(num)) {
                throw new FeelError('ERR_INVALID_NUMBER', `Invalid number '${tok.value}'`, tok.pos);
            }
            return { kind: 'literal', value: num };
        }
        if (tok.type === 'string') {
            this.consume();
            return { kind: 'literal', value: tok.value };
        }
        if (tok.type === 'boolean') {
            this.consume();
            return { kind: 'literal', value: tok.value === 'true' };
        }
        if (tok.type === 'null') {
            this.consume();
            return { kind: 'literal', value: null };
        }
        if (tok.type === 'punct' && (tok.value === '(' || tok.value === '[')) {
            return this.parseIntervalOrList();
        }
        if (tok.type === 'ident') {
            const ident = this.consume();
            if (this.peek().type === 'punct' && this.peek().value === '(') {
                this.consume('punct', '(');
                const args = [];
                if (!(this.peek().type === 'punct' && this.peek().value === ')')) {
                    args.push(this.parseExpression());
                    while (this.peek().type === 'punct' && this.peek().value === ',') {
                        this.consume('punct', ',');
                        args.push(this.parseExpression());
                    }
                }
                this.consume('punct', ')');
                return { kind: 'call', fn: ident.value, args };
            }
            const segments = [ident.value];
            if (FORBIDDEN_SEGMENTS.has(ident.value)) {
                throw new FeelError('ERR_FORBIDDEN_IDENTIFIER', `Forbidden identifier '${ident.value}'`, ident.pos);
            }
            while (this.peek().type === 'punct' && this.peek().value === '.') {
                this.consume('punct', '.');
                const nextSeg = this.consume('ident');
                if (FORBIDDEN_SEGMENTS.has(nextSeg.value)) {
                    throw new FeelError('ERR_FORBIDDEN_IDENTIFIER', `Forbidden segment '${nextSeg.value}'`, nextSeg.pos);
                }
                segments.push(nextSeg.value);
            }
            return { kind: 'path', segments };
        }
        throw new FeelError('ERR_UNEXPECTED_TOKEN', `Unexpected token '${tok.value}' (${tok.type}) at position ${tok.pos}`, tok.pos);
    }
}
export function parseFeelExpression(source) {
    const trimmed = source.trim();
    if (!trimmed) {
        throw new FeelError('ERR_EMPTY_EXPRESSION', 'Expression cannot be empty');
    }
    const tokens = tokenizeFeel(trimmed);
    const parser = new Parser(tokens);
    const ast = parser.parseExpression();
    if (parser.peek().type !== 'eof') {
        const rem = parser.peek();
        throw new FeelError('ERR_TRAILING_TOKENS', `Unexpected trailing token '${rem.value}' at ${rem.pos}`, rem.pos);
    }
    return ast;
}
export function parseUnaryTests(source) {
    const trimmed = source.trim();
    if (!trimmed || trimmed === '-') {
        return {
            negated: false,
            items: [{ kind: 'wildcard' }],
            raw: trimmed || '-',
        };
    }
    const tokens = tokenizeFeel(trimmed);
    const parser = new Parser(tokens);
    let negated = false;
    if (parser.peek().type === 'op' && parser.peek().value === 'not' && parser.peek(1).value === '(') {
        parser.consume('op', 'not');
        parser.consume('punct', '(');
        negated = true;
    }
    const items = [];
    items.push(parseSingleUnaryItem(parser));
    while (parser.peek().type === 'punct' && parser.peek().value === ',') {
        parser.consume('punct', ',');
        items.push(parseSingleUnaryItem(parser));
    }
    if (negated) {
        parser.consume('punct', ')');
    }
    if (parser.peek().type !== 'eof') {
        const rem = parser.peek();
        throw new FeelError('ERR_TRAILING_UNARY', `Unexpected token '${rem.value}' in unary test`, rem.pos);
    }
    return { negated, items, raw: trimmed };
}
function parseSingleUnaryItem(parser) {
    const tok = parser.peek();
    // Wildcard '-' alone
    if (tok.type === 'op' &&
        tok.value === '-' &&
        (parser.peek(1).type === 'eof' ||
            (parser.peek(1).type === 'punct' && (parser.peek(1).value === ',' || parser.peek(1).value === ')')))) {
        parser.consume();
        return { kind: 'wildcard' };
    }
    // Comparison unary test: < 100, <= 500, != "prod", = 42
    if (tok.type === 'op' &&
        (tok.value === '<' ||
            tok.value === '<=' ||
            tok.value === '>' ||
            tok.value === '>=' ||
            tok.value === '=' ||
            tok.value === '!=')) {
        const op = parser.consume().value;
        const expr = parser.parseExpression();
        return { kind: 'compare', op, expr };
    }
    // Range test: [100..500], (0..100]
    if (tok.type === 'punct' && (tok.value === '[' || tok.value === '(')) {
        const intervalOrExpr = parser.parseIntervalOrList();
        if (intervalOrExpr.kind === 'interval') {
            return {
                kind: 'range',
                start: intervalOrExpr.start,
                end: intervalOrExpr.end,
                startInclusive: intervalOrExpr.startInclusive,
                endInclusive: intervalOrExpr.endInclusive,
            };
        }
        return { kind: 'expr', expr: intervalOrExpr };
    }
    const expr = parser.parseExpression();
    return { kind: 'expr', expr };
}
export function evaluateFeel(ast, context, options) {
    const maxSteps = options?.maxSteps ?? 5000;
    let steps = 0;
    function step() {
        steps++;
        if (steps > maxSteps) {
            throw new FeelError('ERR_BUDGET_EXCEEDED', `FEEL evaluation exceeded step budget (${maxSteps})`);
        }
    }
    function evalNode(node) {
        step();
        switch (node.kind) {
            case 'literal':
                return node.value;
            case 'path': {
                let cur = context;
                for (const seg of node.segments) {
                    if (cur === null || cur === undefined || typeof cur !== 'object') {
                        return null;
                    }
                    if (!Object.prototype.hasOwnProperty.call(cur, seg)) {
                        return null;
                    }
                    cur = cur[seg];
                }
                return normalizeValue(cur);
            }
            case 'unary': {
                const val = evalNode(node.operand);
                if (node.op === '-') {
                    return typeof val === 'number' ? -val : null;
                }
                if (node.op === 'not') {
                    return typeof val === 'boolean' ? !val : null;
                }
                return null;
            }
            case 'interval': {
                const start = evalNode(node.start);
                const end = evalNode(node.end);
                if (typeof start !== 'number' || typeof end !== 'number') {
                    return null;
                }
                return {
                    __kind: 'interval',
                    start,
                    end,
                    startInclusive: node.startInclusive,
                    endInclusive: node.endInclusive,
                };
            }
            case 'list':
                return node.items.map((item) => evalNode(item));
            case 'call':
                return evaluateBuiltin(node.fn, node.args.map((a) => evalNode(a)));
            case 'binary': {
                if (node.op === 'and') {
                    const l = evalNode(node.left);
                    if (l === false)
                        return false;
                    const r = evalNode(node.right);
                    if (r === false)
                        return false;
                    if (l === true && r === true)
                        return true;
                    return null;
                }
                if (node.op === 'or') {
                    const l = evalNode(node.left);
                    if (l === true)
                        return true;
                    const r = evalNode(node.right);
                    if (r === true)
                        return true;
                    if (l === false && r === false)
                        return false;
                    return null;
                }
                const l = evalNode(node.left);
                const r = evalNode(node.right);
                if (node.op === '=') {
                    return feelEquals(l, r);
                }
                if (node.op === '!=') {
                    return !feelEquals(l, r);
                }
                if (node.op === 'in') {
                    return checkMembership(l, r);
                }
                if (node.op === '<' || node.op === '<=' || node.op === '>' || node.op === '>=') {
                    if (typeof l === 'number' && typeof r === 'number') {
                        if (node.op === '<')
                            return l < r;
                        if (node.op === '<=')
                            return l <= r;
                        if (node.op === '>')
                            return l > r;
                        return l >= r;
                    }
                    if (typeof l === 'string' && typeof r === 'string') {
                        if (node.op === '<')
                            return l < r;
                        if (node.op === '<=')
                            return l <= r;
                        if (node.op === '>')
                            return l > r;
                        return l >= r;
                    }
                    return null;
                }
                if (node.op === '+') {
                    if (typeof l === 'number' && typeof r === 'number')
                        return l + r;
                    if (typeof l === 'string' && typeof r === 'string')
                        return l + r;
                    return null;
                }
                if (node.op === '-') {
                    return typeof l === 'number' && typeof r === 'number' ? l - r : null;
                }
                if (node.op === '*') {
                    return typeof l === 'number' && typeof r === 'number' ? l * r : null;
                }
                if (node.op === '/') {
                    if (typeof l === 'number' && typeof r === 'number') {
                        return r === 0 ? null : l / r;
                    }
                    return null;
                }
                return null;
            }
        }
    }
    return evalNode(ast);
}
function normalizeValue(v) {
    if (v === null || v === undefined)
        return null;
    if (typeof v === 'number')
        return Number.isFinite(v) ? v : null;
    if (typeof v === 'string' || typeof v === 'boolean')
        return v;
    if (Array.isArray(v))
        return v.map((x) => normalizeValue(x));
    if (typeof v === 'object') {
        const out = {};
        for (const [k, val] of Object.entries(v)) {
            if (!FORBIDDEN_SEGMENTS.has(k)) {
                out[k] = normalizeValue(val);
            }
        }
        return out;
    }
    return null;
}
export function feelEquals(a, b) {
    if (a === b)
        return true;
    if (a === null || b === null)
        return false;
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length)
            return false;
        return a.every((v, idx) => feelEquals(v, b[idx]));
    }
    return false;
}
function isInterval(v) {
    return typeof v === 'object' && v !== null && !Array.isArray(v) && v.__kind === 'interval';
}
function checkMembership(candidate, target) {
    if (candidate === null || target === null)
        return false;
    if (isInterval(target)) {
        if (typeof candidate !== 'number')
            return false;
        const afterStart = target.startInclusive ? candidate >= target.start : candidate > target.start;
        const beforeEnd = target.endInclusive ? candidate <= target.end : candidate < target.end;
        return afterStart && beforeEnd;
    }
    if (Array.isArray(target)) {
        for (const item of target) {
            if (isInterval(item)) {
                if (checkMembership(candidate, item) === true)
                    return true;
            }
            else if (feelEquals(candidate, item)) {
                return true;
            }
        }
        return false;
    }
    return feelEquals(candidate, target);
}
function evaluateBuiltin(fn, args) {
    switch (fn) {
        case 'abs':
            return typeof args[0] === 'number' ? Math.abs(args[0]) : null;
        case 'floor':
            return typeof args[0] === 'number' ? Math.floor(args[0]) : null;
        case 'ceiling':
            return typeof args[0] === 'number' ? Math.ceil(args[0]) : null;
        case 'round': {
            const n = args[0];
            const scale = typeof args[1] === 'number' ? args[1] : 0;
            if (typeof n !== 'number')
                return null;
            const factor = Math.pow(10, scale);
            return Math.round(n * factor) / factor;
        }
        case 'min': {
            const list = Array.isArray(args[0]) ? args[0] : args;
            const nums = list.filter((x) => typeof x === 'number');
            return nums.length > 0 ? Math.min(...nums) : null;
        }
        case 'max': {
            const list = Array.isArray(args[0]) ? args[0] : args;
            const nums = list.filter((x) => typeof x === 'number');
            return nums.length > 0 ? Math.max(...nums) : null;
        }
        case 'sum': {
            const list = Array.isArray(args[0]) ? args[0] : args;
            const nums = list.filter((x) => typeof x === 'number');
            return nums.reduce((acc, v) => acc + v, 0);
        }
        case 'count':
            return Array.isArray(args[0]) ? args[0].length : args.length;
        case 'contains':
            return typeof args[0] === 'string' && typeof args[1] === 'string'
                ? args[0].includes(args[1])
                : null;
        case 'startsWith':
            return typeof args[0] === 'string' && typeof args[1] === 'string'
                ? args[0].startsWith(args[1])
                : null;
        case 'endsWith':
            return typeof args[0] === 'string' && typeof args[1] === 'string'
                ? args[0].endsWith(args[1])
                : null;
        case 'lowerCase':
            return typeof args[0] === 'string' ? args[0].toLowerCase() : null;
        case 'upperCase':
            return typeof args[0] === 'string' ? args[0].toUpperCase() : null;
        case 'isDefined':
            return args[0] !== null && args[0] !== undefined;
        case 'not':
            return typeof args[0] === 'boolean' ? !args[0] : null;
        default:
            throw new FeelError('ERR_UNKNOWN_FUNCTION', `Unknown FEEL function '${fn}'`);
    }
}
export function evaluateUnaryTests(unary, inputValue, context = {}, options) {
    const extendedCtx = { ...context, '?': inputValue };
    const matchSingle = (item) => {
        switch (item.kind) {
            case 'wildcard':
                return true;
            case 'compare': {
                if (inputValue === null) {
                    const target = evaluateFeel(item.expr, extendedCtx, options);
                    if (item.op === '=')
                        return target === null;
                    if (item.op === '!=')
                        return target !== null;
                    return false;
                }
                const target = evaluateFeel(item.expr, extendedCtx, options);
                if (item.op === '=')
                    return feelEquals(inputValue, target);
                if (item.op === '!=')
                    return !feelEquals(inputValue, target);
                if (typeof inputValue === 'number' && typeof target === 'number') {
                    if (item.op === '<')
                        return inputValue < target;
                    if (item.op === '<=')
                        return inputValue <= target;
                    if (item.op === '>')
                        return inputValue > target;
                    if (item.op === '>=')
                        return inputValue >= target;
                }
                if (typeof inputValue === 'string' && typeof target === 'string') {
                    if (item.op === '<')
                        return inputValue < target;
                    if (item.op === '<=')
                        return inputValue <= target;
                    if (item.op === '>')
                        return inputValue > target;
                    if (item.op === '>=')
                        return inputValue >= target;
                }
                return false;
            }
            case 'range': {
                if (typeof inputValue !== 'number')
                    return false;
                const start = evaluateFeel(item.start, extendedCtx, options);
                const end = evaluateFeel(item.end, extendedCtx, options);
                if (typeof start !== 'number' || typeof end !== 'number')
                    return false;
                const okStart = item.startInclusive ? inputValue >= start : inputValue > start;
                const okEnd = item.endInclusive ? inputValue <= end : inputValue < end;
                return okStart && okEnd;
            }
            case 'expr': {
                const val = evaluateFeel(item.expr, extendedCtx, options);
                if (isInterval(val)) {
                    return checkMembership(inputValue, val) === true;
                }
                if (Array.isArray(val)) {
                    return checkMembership(inputValue, val) === true;
                }
                // If expression references `?` and evaluates to boolean, treat as predicate
                if (typeof val === 'boolean' && typeof inputValue !== 'boolean') {
                    return val;
                }
                return feelEquals(inputValue, val);
            }
        }
    };
    const anyMatched = unary.items.some(matchSingle);
    return unary.negated ? !anyMatched : anyMatched;
}
/**
 * Extracts all variable paths referenced in a FEEL AST (sorted, deduplicated).
 */
export function extractFreeVariables(ast) {
    const vars = new Set();
    function visit(node) {
        switch (node.kind) {
            case 'literal':
                return;
            case 'path':
                vars.add(node.segments.join('.'));
                return;
            case 'unary':
                visit(node.operand);
                return;
            case 'binary':
                visit(node.left);
                visit(node.right);
                return;
            case 'interval':
                visit(node.start);
                visit(node.end);
                return;
            case 'list':
                node.items.forEach(visit);
                return;
            case 'call':
                node.args.forEach(visit);
                return;
        }
    }
    visit(ast);
    return Array.from(vars).sort();
}
/**
 * Extracts boundary sample values from a collection of unary tests for a column,
 * enabling exact finite-domain counterexample generation for DMN overlap & gap analysis.
 */
export function extractDomainSamplePoints(testsList, columnType, allowedValues) {
    if (allowedValues && allowedValues.length > 0) {
        return [...allowedValues];
    }
    if (columnType === 'boolean') {
        return [true, false];
    }
    const numbers = new Set();
    const strings = new Set();
    const booleans = new Set();
    function collectExpr(ast) {
        if (ast.kind === 'literal') {
            if (typeof ast.value === 'number')
                numbers.add(ast.value);
            else if (typeof ast.value === 'string')
                strings.add(ast.value);
            else if (typeof ast.value === 'boolean')
                booleans.add(ast.value);
        }
        else if (ast.kind === 'unary' && ast.op === '-' && ast.operand.kind === 'literal' && typeof ast.operand.value === 'number') {
            numbers.add(-ast.operand.value);
        }
        else if (ast.kind === 'list') {
            ast.items.forEach(collectExpr);
        }
        else if (ast.kind === 'interval') {
            collectExpr(ast.start);
            collectExpr(ast.end);
        }
    }
    for (const ut of testsList) {
        for (const item of ut.items) {
            if (item.kind === 'compare' || item.kind === 'expr') {
                collectExpr(item.expr);
            }
            else if (item.kind === 'range') {
                collectExpr(item.start);
                collectExpr(item.end);
            }
        }
    }
    if (columnType === 'number' || (numbers.size > 0 && strings.size === 0 && booleans.size === 0)) {
        const sorted = Array.from(numbers).sort((a, b) => a - b);
        const points = new Set([0]);
        for (let i = 0; i < sorted.length; i++) {
            const v = sorted[i];
            points.add(v - 1);
            points.add(v);
            points.add(v + 1);
            if (i + 1 < sorted.length) {
                const mid = Math.floor((v + sorted[i + 1]) / 2);
                points.add(mid);
            }
        }
        return Array.from(points).sort((a, b) => a - b);
    }
    if (columnType === 'string' || strings.size > 0) {
        const list = Array.from(strings);
        if (!list.includes('__other__')) {
            list.push('__other__');
        }
        return list;
    }
    if (booleans.size > 0) {
        return [true, false];
    }
    return [true, false];
}
//# sourceMappingURL=engine.js.map
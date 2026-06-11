// Excel-like formula parser and executor
// Supports: SUM, AVERAGE, COUNT, MIN, MAX, IF, CONCAT, and basic arithmetic

type CellValue = string | number | boolean | null
type CellGetter = (cellId: string) => CellValue

interface FormulaResult {
    value: CellValue
    error?: string
}

// Parse cell reference like "A1" to column and row
function parseCellRef(ref: string): { col: string; row: number } | null {
    const match = ref.match(/^([A-Z]+)(\d+)$/i)
    if (!match) return null
    return {
        col: match[1].toUpperCase(),
        row: parseInt(match[2], 10)
    }
}

// Convert column letter to index (A=0, B=1, etc.)
function colToIndex(col: string): number {
    let index = 0
    for (let i = 0; i < col.length; i++) {
        index = index * 26 + (col.charCodeAt(i) - 64)
    }
    return index - 1
}

// Convert index to column letter
function indexToCol(index: number): string {
    let col = ''
    index++
    while (index > 0) {
        const mod = (index - 1) % 26
        col = String.fromCharCode(65 + mod) + col
        index = Math.floor((index - 1) / 26)
    }
    return col
}

// Expand range like "A1:C3" to array of cell IDs
function expandRange(range: string): string[] {
    const [start, end] = range.split(':')
    const startRef = parseCellRef(start)
    const endRef = parseCellRef(end)

    if (!startRef || !endRef) return []

    const startCol = colToIndex(startRef.col)
    const endCol = colToIndex(endRef.col)
    const startRow = startRef.row
    const endRow = endRef.row

    const cells: string[] = []
    for (let row = Math.min(startRow, endRow); row <= Math.max(startRow, endRow); row++) {
        for (let col = Math.min(startCol, endCol); col <= Math.max(startCol, endCol); col++) {
            cells.push(`${indexToCol(col)}${row}`)
        }
    }

    return cells
}

// Get numeric values from range
function getNumericValues(range: string, getCell: CellGetter): number[] {
    const cells = range.includes(':') ? expandRange(range) : [range]
    return cells
        .map(id => getCell(id))
        .filter(v => typeof v === 'number') as number[]
}

// Built-in functions
const FUNCTIONS: Record<string, (args: string[], getCell: CellGetter) => CellValue> = {
    // Math functions
    SUM: (args, getCell) => {
        const values = args.flatMap(arg => getNumericValues(arg, getCell))
        return values.reduce((a, b) => a + b, 0)
    },

    AVERAGE: (args, getCell) => {
        const values = args.flatMap(arg => getNumericValues(arg, getCell))
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
    },

    COUNT: (args, getCell) => {
        const values = args.flatMap(arg => getNumericValues(arg, getCell))
        return values.length
    },

    MIN: (args, getCell) => {
        const values = args.flatMap(arg => getNumericValues(arg, getCell))
        return values.length > 0 ? Math.min(...values) : 0
    },

    MAX: (args, getCell) => {
        const values = args.flatMap(arg => getNumericValues(arg, getCell))
        return values.length > 0 ? Math.max(...values) : 0
    },

    ABS: (args, getCell) => {
        const val = evaluateExpression(args[0], getCell)
        return typeof val === 'number' ? Math.abs(val) : 0
    },

    ROUND: (args, getCell) => {
        const val = evaluateExpression(args[0], getCell)
        const decimals = args[1] ? Number(evaluateExpression(args[1], getCell)) : 0
        return typeof val === 'number' ? Number(val.toFixed(decimals)) : 0
    },

    // Logical functions
    IF: (args, getCell) => {
        const condition = evaluateExpression(args[0], getCell)
        const trueVal = evaluateExpression(args[1], getCell)
        const falseVal = args[2] ? evaluateExpression(args[2], getCell) : ''
        return condition ? trueVal : falseVal
    },

    AND: (args, getCell) => {
        return args.every(arg => Boolean(evaluateExpression(arg, getCell)))
    },

    OR: (args, getCell) => {
        return args.some(arg => Boolean(evaluateExpression(arg, getCell)))
    },

    NOT: (args, getCell) => {
        return !Boolean(evaluateExpression(args[0], getCell))
    },

    // Text functions
    CONCAT: (args, getCell) => {
        return args.map(arg => String(evaluateExpression(arg, getCell))).join('')
    },

    UPPER: (args, getCell) => {
        const val = evaluateExpression(args[0], getCell)
        return String(val).toUpperCase()
    },

    LOWER: (args, getCell) => {
        const val = evaluateExpression(args[0], getCell)
        return String(val).toLowerCase()
    },

    LEN: (args, getCell) => {
        const val = evaluateExpression(args[0], getCell)
        return String(val).length
    },

    // Date functions
    TODAY: () => {
        return new Date().toISOString().split('T')[0]
    },

    NOW: () => {
        return new Date().toISOString()
    },

    // Lookup (simple version)
    COUNTA: (args, getCell) => {
        const cells = args.flatMap(arg =>
            arg.includes(':') ? expandRange(arg) : [arg]
        )
        return cells.filter(id => {
            const val = getCell(id)
            return val !== null && val !== ''
        }).length
    }
}

// Parse function call like "SUM(A1:A10)"
function parseFunction(formula: string): { name: string; args: string[] } | null {
    const match = formula.match(/^([A-Z]+)\((.+)\)$/i)
    if (!match) return null

    const name = match[1].toUpperCase()
    const argsStr = match[2]

    // Parse arguments (handle nested functions)
    const args: string[] = []
    let current = ''
    let depth = 0

    for (const char of argsStr) {
        if (char === '(') depth++
        if (char === ')') depth--
        if (char === ',' && depth === 0) {
            args.push(current.trim())
            current = ''
        } else {
            current += char
        }
    }
    if (current.trim()) {
        args.push(current.trim())
    }

    return { name, args }
}

// Evaluate basic arithmetic expression
function evaluateArithmetic(expr: string, getCell: CellGetter): number {
    // Replace cell references with values
    const withValues = expr.replace(/[A-Z]+\d+/gi, (match) => {
        const val = getCell(match.toUpperCase())
        return typeof val === 'number' ? String(val) : '0'
    })

    try {
        // Safe eval for basic arithmetic
        // Only allow numbers and operators
        if (!/^[\d\s+\-*/().]+$/.test(withValues)) {
            return 0
        }
        return Function(`"use strict"; return (${withValues})`)()
    } catch {
        return 0
    }
}

// Evaluate comparison expression
function evaluateComparison(expr: string, getCell: CellGetter): boolean {
    const operators = ['>=', '<=', '<>', '!=', '>', '<', '=']

    for (const op of operators) {
        const parts = expr.split(op)
        if (parts.length === 2) {
            const left = evaluateExpression(parts[0].trim(), getCell)
            const right = evaluateExpression(parts[1].trim(), getCell)

            switch (op) {
                case '>=': return Number(left) >= Number(right)
                case '<=': return Number(left) <= Number(right)
                case '<>':
                case '!=': return left !== right
                case '>': return Number(left) > Number(right)
                case '<': return Number(left) < Number(right)
                case '=': return left === right
            }
        }
    }

    return false
}

// Main expression evaluator
function evaluateExpression(expr: string, getCell: CellGetter): CellValue {
    expr = expr.trim()

    // String literal
    if (expr.startsWith('"') && expr.endsWith('"')) {
        return expr.slice(1, -1)
    }

    // Number literal
    if (/^-?\d+\.?\d*$/.test(expr)) {
        return parseFloat(expr)
    }

    // Boolean literal
    if (expr.toUpperCase() === 'TRUE') return true
    if (expr.toUpperCase() === 'FALSE') return false

    // Function call
    const func = parseFunction(expr)
    if (func) {
        const fn = FUNCTIONS[func.name]
        if (fn) {
            return fn(func.args, getCell)
        }
        return `#NAME?` // Unknown function
    }

    // Cell reference
    if (/^[A-Z]+\d+$/i.test(expr)) {
        return getCell(expr.toUpperCase())
    }

    // Comparison
    if (/[><=]/.test(expr)) {
        return evaluateComparison(expr, getCell)
    }

    // Arithmetic
    if (/[+\-*/]/.test(expr)) {
        return evaluateArithmetic(expr, getCell)
    }

    return expr
}

// Main formula execution function
export function executeFormula(formula: string, getCell: CellGetter): FormulaResult {
    // Must start with =
    if (!formula.startsWith('=')) {
        return { value: formula }
    }

    const expr = formula.slice(1).trim()

    try {
        const value = evaluateExpression(expr, getCell)
        return { value }
    } catch (error) {
        return {
            value: '#ERROR!',
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

// Check if a string is a formula
export function isFormula(value: string): boolean {
    return typeof value === 'string' && value.startsWith('=')
}

// Get cell dependencies from a formula
export function getFormulaDependencies(formula: string): string[] {
    if (!isFormula(formula)) return []

    const expr = formula.slice(1)
    const cells: string[] = []

    // Match cell references
    const singleCells = expr.match(/[A-Z]+\d+/gi) || []
    cells.push(...singleCells.map(c => c.toUpperCase()))

    // Match and expand ranges
    const ranges = expr.match(/[A-Z]+\d+:[A-Z]+\d+/gi) || []
    for (const range of ranges) {
        cells.push(...expandRange(range))
    }

    return [...new Set(cells)]
}

// Available functions for UI display
export const AVAILABLE_FUNCTIONS = [
    { name: 'SUM', syntax: 'SUM(range)', description: 'Сумма значений' },
    { name: 'AVERAGE', syntax: 'AVERAGE(range)', description: 'Среднее значение' },
    { name: 'COUNT', syntax: 'COUNT(range)', description: 'Количество чисел' },
    { name: 'MIN', syntax: 'MIN(range)', description: 'Минимальное значение' },
    { name: 'MAX', syntax: 'MAX(range)', description: 'Максимальное значение' },
    { name: 'IF', syntax: 'IF(condition, true_val, false_val)', description: 'Условие' },
    { name: 'CONCAT', syntax: 'CONCAT(text1, text2, ...)', description: 'Объединение текста' },
    { name: 'ROUND', syntax: 'ROUND(number, decimals)', description: 'Округление' },
    { name: 'TODAY', syntax: 'TODAY()', description: 'Сегодняшняя дата' },
    { name: 'COUNTA', syntax: 'COUNTA(range)', description: 'Непустые ячейки' }
]

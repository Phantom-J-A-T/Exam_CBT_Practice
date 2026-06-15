import { useState } from 'react';
import { X, Delete, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface CbtCalculatorProps {
  onClose: () => void;
}

// Custom Recursive Descent Parser for safe and robust mathematical evaluation
class MathParser {
  private str: string;
  private pos: number = 0;
  private isDeg: boolean;
  private ansValue: number;

  constructor(str: string, isDeg: boolean, ansValue: number) {
    // Replace 'ans' with its numeric value and remove all whitespace
    this.str = str
      .replace(/ans/g, ansValue.toString())
      .replace(/\s+/g, '');
    this.isDeg = isDeg;
    this.ansValue = ansValue;
  }

  private peek(): string {
    return this.pos < this.str.length ? this.str[this.pos] : '';
  }

  private next(): string {
    return this.pos < this.str.length ? this.str[this.pos++] : '';
  }

  private match(char: string): boolean {
    if (this.peek() === char) {
      this.pos++;
      return true;
    }
    return false;
  }

  private matchString(s: string): boolean {
    if (this.str.substring(this.pos, this.pos + s.length) === s) {
      this.pos += s.length;
      return true;
    }
    return false;
  }

  public parse(): number {
    if (this.str.length === 0) return 0;
    const val = this.parseExpression();
    if (this.pos < this.str.length) {
      throw new Error(`Unexpected character '${this.peek()}' at position ${this.pos}`);
    }
    return val;
  }

  private parseExpression(): number {
    let val = this.parseTerm();
    while (true) {
      if (this.match('+')) {
        val += this.parseTerm();
      } else if (this.match('-')) {
        val -= this.parseTerm();
      } else {
        break;
      }
    }
    return val;
  }

  private parseTerm(): number {
    let val = this.parseFactor();
    while (true) {
      if (this.match('*')) {
        val *= this.parseFactor();
      } else if (this.match('/')) {
        const divisor = this.parseFactor();
        if (divisor === 0) throw new Error("Division by zero");
        val /= divisor;
      } else if (this.match('%')) {
        const divisor = this.parseFactor();
        if (divisor === 0) throw new Error("Modulo by zero");
        val %= divisor;
      } else {
        break;
      }
    }
    return val;
  }

  private parseFactor(): number {
    let val = this.parsePrimary();
    while (true) {
      if (this.match('^')) {
        val = Math.pow(val, this.parsePrimary());
      } else {
        break;
      }
    }
    return val;
  }

  private parsePrimary(): number {
    if (this.match('+')) {
      return this.parsePrimary();
    }
    if (this.match('-')) {
      return -this.parsePrimary();
    }

    // Check constants
    if (this.matchString('π') || this.matchString('pi')) {
      return Math.PI;
    }
    if (this.matchString('e')) {
      return Math.E;
    }

    // Check scientific function calls
    const funcs = ['asin', 'acos', 'atan', 'sin', 'cos', 'tan', 'log', 'ln', 'sqrt'];
    for (const func of funcs) {
      if (this.matchString(func)) {
        if (!this.match('(')) {
          throw new Error(`Missing '(' after ${func}`);
        }
        const arg = this.parseExpression();
        if (!this.match(')')) {
          throw new Error(`Missing ')' after ${func} argument`);
        }

        switch (func) {
          case 'sin':
            return Math.sin(this.isDeg ? (arg * Math.PI) / 180 : arg);
          case 'cos':
            return Math.cos(this.isDeg ? (arg * Math.PI) / 180 : arg);
          case 'tan':
            return Math.tan(this.isDeg ? (arg * Math.PI) / 180 : arg);
          case 'asin':
            if (arg < -1 || arg > 1) throw new Error("asin domain error");
            const rasin = Math.asin(arg);
            return this.isDeg ? (rasin * 180) / Math.PI : rasin;
          case 'acos':
            if (arg < -1 || arg > 1) throw new Error("acos domain error");
            const racos = Math.acos(arg);
            return this.isDeg ? (racos * 180) / Math.PI : racos;
          case 'atan':
            const ratan = Math.atan(arg);
            return this.isDeg ? (ratan * 180) / Math.PI : ratan;
          case 'log':
            if (arg <= 0) throw new Error("log domain error");
            return Math.log10(arg);
          case 'ln':
            if (arg <= 0) throw new Error("ln domain error");
            return Math.log(arg);
          case 'sqrt':
            if (arg < 0) throw new Error("sqrt domain error");
            return Math.sqrt(arg);
          default:
            throw new Error(`Unknown function: ${func}`);
        }
      }
    }

    if (this.match('(')) {
      const val = this.parseExpression();
      if (!this.match(')')) {
        throw new Error("Missing closing ')'");
      }
      return val;
    }

    // Parse numeric value
    const start = this.pos;
    let hasDot = false;
    while (this.pos < this.str.length) {
      const c = this.peek();
      if (c >= '0' && c <= '9') {
        this.pos++;
      } else if (c === '.' && !hasDot) {
        hasDot = true;
        this.pos++;
      } else {
        break;
      }
    }

    if (this.pos === start) {
      throw new Error(`Invalid expression at position ${this.pos}`);
    }

    return parseFloat(this.str.substring(start, this.pos));
  }
}

// Preprocessor for inserting implicit multiplication operators
const preprocessExpression = (expr: string): string => {
  let res = expr;
  // 1. Insert * between a digit/constant and a parenthesis: e.g., 2(3+4) -> 2*(3+4)
  res = res.replace(/([\dπe])\(/g, '$1*(');
  // 2. Insert * between a closing parenthesis and a digit/constant/function: e.g., (3+4)2 -> (3+4)*2
  res = res.replace(/\)([\dπe\(sctl])/g, ')*$1');
  // 3. Insert * between a digit and a constant or function: e.g., 2sin(30) -> 2*sin(30), 2π -> 2*π
  res = res.replace(/(\d)([πesctl])/g, '$1*$2');
  // 4. Insert * between constants and functions: e.g., πsin(30) -> π*sin(30)
  res = res.replace(/([πe])([sctl])/g, '$1*$2');
  // 5. Insert * between constants: e.g., πe -> π*e
  res = res.replace(/([πe])([πe])/g, '$1*$2');
  return res;
};

// Formatter to render mathematical symbols beautifully on screen
const renderExpression = (expr: string): string => {
  return expr
    .replace(/\*/g, ' × ')
    .replace(/\//g, ' ÷ ')
    .replace(/\^/g, '^')
    .replace(/sqrt\(/g, '√(')
    .replace(/asin\(/g, 'sin⁻¹(')
    .replace(/acos\(/g, 'cos⁻¹(')
    .replace(/atan\(/g, 'tan⁻¹(')
    .replace(/log\(/g, 'log(')
    .replace(/ln\(/g, 'ln(')
    .replace(/pi/g, 'π')
    .replace(/%/g, ' mod ');
};

export default function CbtCalculator({ onClose }: CbtCalculatorProps) {
  const [isScientific, setIsScientific] = useState(false);
  const [expression, setExpression] = useState('');
  const [display, setDisplay] = useState('0');
  const [ans, setAns] = useState<number>(0);
  const [isDeg, setIsDeg] = useState(true);
  const [isShift, setIsShift] = useState(false);
  const [shouldReset, setShouldReset] = useState(false);
  const [memory, setMemory] = useState<number>(0);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const handleDigit = (digit: string) => {
    setErrorStatus(null);
    if (shouldReset) {
      setExpression(digit);
      setDisplay(digit);
      setShouldReset(false);
    } else {
      setExpression(prev => prev + digit);
      setDisplay(prev => (prev === '0' || shouldReset ? digit : prev + digit));
    }
  };

  const handleOperator = (op: string) => {
    setErrorStatus(null);
    if (shouldReset) {
      setExpression(ans.toString() + op);
      setShouldReset(false);
    } else {
      setExpression(prev => prev + op);
    }
    setDisplay('0');
  };

  const handleFunction = (func: string) => {
    setErrorStatus(null);
    if (shouldReset) {
      setExpression(func);
      setShouldReset(false);
    } else {
      setExpression(prev => prev + func);
    }
    setDisplay('0');
  };

  const handleCalculate = () => {
    if (!expression.trim()) return;
    try {
      setErrorStatus(null);
      const preprocessed = preprocessExpression(expression);
      const parser = new MathParser(preprocessed, isDeg, ans);
      const result = parser.parse();

      if (isNaN(result) || !isFinite(result)) {
        throw new Error("Invalid output");
      }

      const formattedResult = Number(result.toFixed(8)).toString(); // Remove trailing zeros up to 8 decimal places
      setDisplay(formattedResult);
      setAns(result);
      setShouldReset(true);
    } catch (err: any) {
      setDisplay('Error');
      setErrorStatus(err.message || 'Syntax Error');
      setShouldReset(true);
    }
  };

  const handleClear = () => {
    setExpression('');
    setDisplay('0');
    setErrorStatus(null);
    setShouldReset(false);
  };

  const handleBackspace = () => {
    setErrorStatus(null);
    if (shouldReset) {
      handleClear();
      return;
    }

    const funcLengths = [
      { name: 'asin(', len: 5 },
      { name: 'acos(', len: 5 },
      { name: 'atan(', len: 5 },
      { name: 'sqrt(', len: 5 },
      { name: 'sin(', len: 4 },
      { name: 'cos(', len: 4 },
      { name: 'tan(', len: 4 },
      { name: 'log(', len: 4 },
      { name: 'ln(', len: 3 }
    ];

    for (const f of funcLengths) {
      if (expression.endsWith(f.name)) {
        setExpression(prev => prev.slice(0, -f.len));
        return;
      }
    }

    setExpression(prev => (prev.length > 0 ? prev.slice(0, -1) : ''));
  };

  const handleConstant = (constVal: string) => {
    setErrorStatus(null);
    if (shouldReset) {
      setExpression(constVal);
      setShouldReset(false);
    } else {
      setExpression(prev => prev + constVal);
    }
    setDisplay(constVal);
  };

  // Memory functions
  const handleMemory = (memAction: 'MC' | 'MR' | 'M+' | 'M-') => {
    setErrorStatus(null);
    try {
      const currentVal = parseFloat(display);
      if (isNaN(currentVal) && (memAction === 'M+' || memAction === 'M-')) {
        return;
      }

      switch (memAction) {
        case 'MC':
          setMemory(0);
          break;
        case 'MR':
          if (shouldReset) {
            setExpression(memory.toString());
            setShouldReset(false);
          } else {
            setExpression(prev => prev + memory.toString());
          }
          setDisplay(memory.toString());
          break;
        case 'M+':
          setMemory(prev => prev + currentVal);
          setShouldReset(true);
          break;
        case 'M-':
          setMemory(prev => prev - currentVal);
          setShouldReset(true);
          break;
      }
    } catch {
      setErrorStatus("Memory error");
    }
  };

  return (
    <motion.div 
      layout
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className={`bg-slate-950/95 backdrop-blur-md border border-slate-800 shadow-2xl p-4 text-white font-mono select-none rounded-2xl ${
        isScientific ? 'w-[420px]' : 'w-72'
      }`}
    >
      {/* Title & Close */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 font-extrabold uppercase px-2 py-0.5 rounded tracking-widest font-mono">
            {isScientific ? 'GCE Scientific CBT' : 'GCE Standard CBT'}
          </span>
          {memory !== 0 && (
            <span className="text-[9px] bg-indigo-950 text-indigo-400 border border-indigo-900 px-1 rounded font-bold">M</span>
          )}
        </div>
        
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-900 cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Screen Display */}
      <div className="bg-slate-950/80 p-3 rounded-xl text-right mb-3 border border-slate-900 flex flex-col justify-between h-20 overflow-hidden">
        <div className="text-[10px] text-slate-500 truncate min-h-[14px]">
          {renderExpression(expression)}
        </div>
        <div className="flex justify-between items-end">
          <span className="text-[9px] text-indigo-400 font-bold uppercase">
            {isScientific ? (isDeg ? 'DEG' : 'RAD') : ''}
          </span>
          <div className="text-xl font-bold truncate tracking-tight text-white">
            {display}
          </div>
        </div>
      </div>

      {/* Small Warning / Info Banner */}
      {errorStatus && (
        <div className="text-[9px] text-rose-400 bg-rose-950/40 border border-rose-900 rounded p-1.5 mb-3 text-center">
          {errorStatus}
        </div>
      )}

      {/* Segment Mode Selection Controls */}
      <div className="grid grid-cols-2 gap-1 bg-slate-900/60 p-0.5 rounded-lg border border-slate-900 mb-3 text-[10px] font-bold">
        <button 
          onClick={() => setIsScientific(false)}
          className={`py-1 rounded-md transition-colors cursor-pointer ${!isScientific ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Standard
        </button>
        <button 
          onClick={() => setIsScientific(true)}
          className={`py-1 rounded-md transition-colors cursor-pointer ${isScientific ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Scientific
        </button>
      </div>

      {/* Calculator Keys Grids */}
      {isScientific ? (
        // --- SCIENTIFIC LAYOUT (6 Columns) ---
        <div className="grid grid-cols-6 gap-1.5 text-xs">
          {/* Row 1 */}
          <button 
            onClick={() => setIsShift(!isShift)} 
            className={`p-2.5 rounded-lg font-bold transition-all cursor-pointer text-center ${isShift ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-amber-400 border border-slate-800'}`}
          >
            2nd
          </button>
          <button 
            onClick={() => setIsDeg(!isDeg)} 
            className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-indigo-400 font-bold transition-all cursor-pointer text-center"
          >
            {isDeg ? 'DEG' : 'RAD'}
          </button>
          <button onClick={() => handleFunction('(')} className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold transition-all cursor-pointer text-center">(</button>
          <button onClick={() => handleFunction(')')} className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold transition-all cursor-pointer text-center">)</button>
          <button onClick={handleClear} className="p-2.5 rounded-lg bg-rose-950/70 hover:bg-rose-900/80 text-rose-400 font-bold border border-rose-900 transition-all cursor-pointer text-center">C</button>
          <button onClick={handleBackspace} className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 flex items-center justify-center transition-all cursor-pointer">
            <Delete size={14} />
          </button>

          {/* Row 2 */}
          <button 
            onClick={() => handleFunction(isShift ? 'asin(' : 'sin(')} 
            className="p-2.5 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-900/50 text-indigo-300 font-bold transition-all cursor-pointer text-center"
          >
            {isShift ? 'sin⁻¹' : 'sin'}
          </button>
          <button 
            onClick={() => handleFunction(isShift ? 'acos(' : 'cos(')} 
            className="p-2.5 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-900/50 text-indigo-300 font-bold transition-all cursor-pointer text-center"
          >
            {isShift ? 'cos⁻¹' : 'cos'}
          </button>
          <button onClick={() => handleDigit('7')} className="p-2.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-white font-bold transition-all cursor-pointer text-center">7</button>
          <button onClick={() => handleDigit('8')} className="p-2.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-white font-bold transition-all cursor-pointer text-center">8</button>
          <button onClick={() => handleDigit('9')} className="p-2.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-white font-bold transition-all cursor-pointer text-center">9</button>
          <button onClick={() => handleOperator('/')} className="p-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold transition-all cursor-pointer text-center">÷</button>

          {/* Row 3 */}
          <button 
            onClick={() => handleFunction(isShift ? 'atan(' : 'tan(')} 
            className="p-2.5 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-900/50 text-indigo-300 font-bold transition-all cursor-pointer text-center"
          >
            {isShift ? 'tan⁻¹' : 'tan'}
          </button>
          <button onClick={() => handleOperator('^')} className="p-2.5 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-900/50 text-indigo-400 font-bold transition-all cursor-pointer text-center">xʸ</button>
          <button onClick={() => handleDigit('4')} className="p-2.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-white font-bold transition-all cursor-pointer text-center">4</button>
          <button onClick={() => handleDigit('5')} className="p-2.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-white font-bold transition-all cursor-pointer text-center">5</button>
          <button onClick={() => handleDigit('6')} className="p-2.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-white font-bold transition-all cursor-pointer text-center">6</button>
          <button onClick={() => handleOperator('*')} className="p-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold transition-all cursor-pointer text-center">×</button>

          {/* Row 4 */}
          <button 
            onClick={() => handleFunction(isShift ? '10^(' : 'log(')} 
            className="p-2.5 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-900/50 text-indigo-300 font-bold transition-all cursor-pointer text-center"
          >
            {isShift ? '10ˣ' : 'log'}
          </button>
          <button onClick={() => handleFunction('sqrt(')} className="p-2.5 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-900/50 text-indigo-400 font-bold transition-all cursor-pointer text-center">√</button>
          <button onClick={() => handleDigit('1')} className="p-2.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-white font-bold transition-all cursor-pointer text-center">1</button>
          <button onClick={() => handleDigit('2')} className="p-2.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-white font-bold transition-all cursor-pointer text-center">2</button>
          <button onClick={() => handleDigit('3')} className="p-2.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-white font-bold transition-all cursor-pointer text-center">3</button>
          <button onClick={() => handleOperator('-')} className="p-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold transition-all cursor-pointer text-center">-</button>

          {/* Row 5 */}
          <button 
            onClick={() => handleFunction(isShift ? 'e^(' : 'ln(')} 
            className="p-2.5 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-900/50 text-indigo-300 font-bold transition-all cursor-pointer text-center"
          >
            {isShift ? 'eˣ' : 'ln'}
          </button>
          <button onClick={() => handleConstant('π')} className="p-2.5 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-900/50 text-indigo-400 font-bold transition-all cursor-pointer text-center">π</button>
          <button onClick={() => handleDigit('0')} className="p-2.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-white font-bold transition-all cursor-pointer text-center">0</button>
          <button onClick={() => handleDigit('.')} className="p-2.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-white font-bold transition-all cursor-pointer text-center">.</button>
          <button onClick={() => handleConstant('e')} className="p-2.5 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-900/50 text-indigo-400 font-bold transition-all cursor-pointer text-center">e</button>
          <button onClick={() => handleOperator('+')} className="p-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold transition-all cursor-pointer text-center">+</button>

          {/* Row 6 (Memory & Helpers) */}
          <button onClick={() => handleOperator('1/(')} className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-indigo-400 font-bold transition-all cursor-pointer text-center">1/x</button>
          <button onClick={() => handleOperator('^2')} className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-indigo-400 font-bold transition-all cursor-pointer text-center">x²</button>
          <button onClick={() => handleConstant('ans')} className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 font-bold transition-all cursor-pointer text-center">ans</button>
          <button onClick={() => handleOperator('%')} className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 font-bold transition-all cursor-pointer text-center">mod</button>
          <button onClick={() => handleOperator('/100')} className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 font-bold transition-all cursor-pointer text-center">%</button>
          <button onClick={handleCalculate} className="p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black transition-all cursor-pointer text-center text-sm">=</button>

          {/* Row 7 Memory Control Row */}
          <div className="col-span-6 grid grid-cols-4 gap-1.5 mt-1 border-t border-slate-900 pt-2 text-[10px]">
            <button onClick={() => handleMemory('MC')} className="py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-md font-bold transition-all cursor-pointer">MC</button>
            <button onClick={() => handleMemory('MR')} className="py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-md font-bold transition-all cursor-pointer">MR</button>
            <button onClick={() => handleMemory('M+')} className="py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-md font-bold transition-all cursor-pointer">M+</button>
            <button onClick={() => handleMemory('M-')} className="py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-md font-bold transition-all cursor-pointer">M-</button>
          </div>
        </div>
      ) : (
        // --- STANDARD LAYOUT (4 Columns) ---
        <div className="grid grid-cols-4 gap-2 text-sm">
          {/* Row 1 */}
          <button onClick={handleClear} className="col-span-2 bg-rose-950/70 hover:bg-rose-900/80 text-rose-400 font-bold p-3 rounded-xl border border-rose-900 transition-colors cursor-pointer">C</button>
          <button onClick={handleBackspace} className="bg-slate-900 hover:bg-slate-850 border border-slate-800 p-3 rounded-xl flex items-center justify-center transition-colors cursor-pointer text-slate-400">
            <Delete size={16} />
          </button>
          <button onClick={() => handleOperator('/')} className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold p-3 rounded-xl transition-colors cursor-pointer">÷</button>

          {/* Row 2 */}
          <button onClick={() => handleDigit('7')} className="bg-slate-850 hover:bg-slate-800 p-3 rounded-xl font-bold transition-colors cursor-pointer text-white">7</button>
          <button onClick={() => handleDigit('8')} className="bg-slate-850 hover:bg-slate-800 p-3 rounded-xl font-bold transition-colors cursor-pointer text-white">8</button>
          <button onClick={() => handleDigit('9')} className="bg-slate-850 hover:bg-slate-800 p-3 rounded-xl font-bold transition-colors cursor-pointer text-white">9</button>
          <button onClick={() => handleOperator('*')} className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold p-3 rounded-xl transition-colors cursor-pointer">×</button>

          {/* Row 3 */}
          <button onClick={() => handleDigit('4')} className="bg-slate-850 hover:bg-slate-800 p-3 rounded-xl font-bold transition-colors cursor-pointer text-white">4</button>
          <button onClick={() => handleDigit('5')} className="bg-slate-850 hover:bg-slate-800 p-3 rounded-xl font-bold transition-colors cursor-pointer text-white">5</button>
          <button onClick={() => handleDigit('6')} className="bg-slate-850 hover:bg-slate-800 p-3 rounded-xl font-bold transition-colors cursor-pointer text-white">6</button>
          <button onClick={() => handleOperator('-')} className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold p-3 rounded-xl transition-colors cursor-pointer">-</button>

          {/* Row 4 */}
          <button onClick={() => handleDigit('1')} className="bg-slate-850 hover:bg-slate-800 p-3 rounded-xl font-bold transition-colors cursor-pointer text-white">1</button>
          <button onClick={() => handleDigit('2')} className="bg-slate-850 hover:bg-slate-800 p-3 rounded-xl font-bold transition-colors cursor-pointer text-white">2</button>
          <button onClick={() => handleDigit('3')} className="bg-slate-850 hover:bg-slate-800 p-3 rounded-xl font-bold transition-colors cursor-pointer text-white">3</button>
          <button onClick={() => handleOperator('+')} className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold p-3 rounded-xl transition-colors cursor-pointer">+</button>

          {/* Row 5 */}
          <button onClick={() => handleFunction('sqrt(')} className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-indigo-400 font-bold p-3 rounded-xl transition-colors cursor-pointer">√</button>
          <button onClick={() => handleDigit('0')} className="bg-slate-850 hover:bg-slate-800 p-3 rounded-xl font-bold transition-colors cursor-pointer text-white">0</button>
          <button onClick={() => handleDigit('.')} className="bg-slate-850 hover:bg-slate-800 p-3 rounded-xl font-bold transition-colors cursor-pointer text-white">.</button>
          <button onClick={handleCalculate} className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black p-3 rounded-xl transition-colors cursor-pointer text-base">=</button>
        </div>
      )}
    </motion.div>
  );
}

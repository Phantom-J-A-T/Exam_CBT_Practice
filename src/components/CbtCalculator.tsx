import { useState, useEffect } from 'react';
import { X, Delete } from 'lucide-react';

interface CbtCalculatorProps {
  onClose: () => void;
}

export default function CbtCalculator({ onClose }: CbtCalculatorProps) {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [shouldReset, setShouldReset] = useState(false);
  const [angleMode, setAngleMode] = useState<'DEG' | 'RAD'>('DEG');

  // Strip commas to parse float
  const getNumericValue = (str: string): number => {
    const cleaned = str.replace(/,/g, '');
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
  };

  // Format scientific output cleanly
  const formatDisplay = (num: number): string => {
    if (isNaN(num)) return 'Error';
    if (!isFinite(num)) return 'Infinity';
    
    const absVal = Math.abs(num);
    // Use exponential format for extremely small or large numbers
    if (absVal > 0 && (absVal < 1e-7 || absVal >= 1e12)) {
      return num.toExponential(6);
    }
    
    // Smooth rounding to prevent JS precision issues (e.g. 0.1 + 0.2 = 0.30000000000000004)
    const rounded = Number(num.toFixed(10));
    return Number(rounded.toFixed(8)).toString(); // stripping unnecessary trailing decimals
  };

  const handleDigit = (digit: string) => {
    if (display === '0' || shouldReset || display === 'Error' || display === 'Infinity') {
      setDisplay(digit === '.' ? '0.' : digit);
      setShouldReset(false);
    } else {
      if (digit === '.' && display.includes('.')) return;
      setDisplay(display + digit);
    }
  };

  const handleOperator = (op: string) => {
    let currentEquation = equation;
    // Replace visual symbols back to JavaScript symbols for internal engine
    const opToken = op === '×' ? '*' : op === '÷' ? '/' : op;
    
    if (shouldReset && equation && !equation.trim().endsWith('(') && !equation.trim().endsWith(')')) {
      currentEquation = display + ' ' + opToken + ' ';
    } else {
      currentEquation = equation + display + ' ' + opToken + ' ';
    }
    
    setEquation(currentEquation);
    setShouldReset(true);
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setShouldReset(false);
  };

  const handleBackspace = () => {
    if (display === 'Error' || display === 'Infinity' || shouldReset) {
      setDisplay('0');
      setShouldReset(false);
    } else if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleBracketOpen = () => {
    setEquation(prev => prev + '( ');
    setShouldReset(true);
  };

  const handleBracketClose = () => {
    // Append current screen value followed by closing bracket
    setEquation(prev => prev + display + ' ) ');
    setShouldReset(true);
  };

  const handleCalculate = () => {
    if (!equation && !shouldReset) return;
    try {
      let fullExpression = equation + display;
      
      // Auto-close missing parentheses
      const openCount = (fullExpression.match(/\(/g) || []).length;
      const closeCount = (fullExpression.match(/\)/g) || []).length;
      if (openCount > closeCount) {
        fullExpression += ' )'.repeat(openCount - closeCount);
      }

      // Convert customized operators to standard JS evaluation rules
      let parsed = fullExpression
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/\^/g, '**');

      // Sanitize sequence (only allow digits, math operators, decimals and parentheses)
      const sanitized = parsed.replace(/[^-()\d/*+.\s%*]/g, '');

      // Evaluate safe parsed sequence
      // eslint-disable-next-line no-eval
      const result = eval(sanitized);
      setDisplay(formatDisplay(Number(result)));
      setEquation('');
      setShouldReset(true);
    } catch (err) {
      console.error("Calculation failure:", err);
      setDisplay('Error');
      setEquation('');
      setShouldReset(true);
    }
  };

  // Immediate scientific/unary calculation modifiers (operates in-place on displayed values)
  const applyUnaryFunction = (func: string) => {
    const val = getNumericValue(display);
    let result = 0;

    switch (func) {
      case 'sqr':
        result = Math.pow(val, 2);
        break;
      case 'sqrt':
        if (val < 0) {
          setDisplay('Error');
          setShouldReset(true);
          return;
        }
        result = Math.sqrt(val);
        break;
      case 'log':
        if (val <= 0) {
          setDisplay('Error');
          setShouldReset(true);
          return;
        }
        result = Math.log10(val);
        break;
      case 'ln':
        if (val <= 0) {
          setDisplay('Error');
          setShouldReset(true);
          return;
        }
        result = Math.log(val);
        break;
      case 'sin': {
        const rad = angleMode === 'DEG' ? val * (Math.PI / 180) : val;
        result = Math.sin(rad);
        if (Math.abs(result) < 1e-14) result = 0;
        break;
      }
      case 'cos': {
        const rad = angleMode === 'DEG' ? val * (Math.PI / 180) : val;
        result = Math.cos(rad);
        if (Math.abs(result) < 1e-14) result = 0;
        break;
      }
      case 'tan': {
        const rad = angleMode === 'DEG' ? val * (Math.PI / 180) : val;
        const cosVal = Math.cos(rad);
        if (Math.abs(cosVal) < 1e-14) {
          setDisplay('Error');
          setShouldReset(true);
          return;
        }
        result = Math.tan(rad);
        if (Math.abs(result) < 1e-14) result = 0;
        break;
      }
      case 'asin': {
        if (val < -1 || val > 1) {
          setDisplay('Error');
          setShouldReset(true);
          return;
        }
        const radResult = Math.asin(val);
        result = angleMode === 'DEG' ? radResult * (180 / Math.PI) : radResult;
        break;
      }
      case 'acos': {
        if (val < -1 || val > 1) {
          setDisplay('Error');
          setShouldReset(true);
          return;
        }
        const radResult = Math.acos(val);
        result = angleMode === 'DEG' ? radResult * (180 / Math.PI) : radResult;
        break;
      }
      case 'atan': {
        const radResult = Math.atan(val);
        result = angleMode === 'DEG' ? radResult * (180 / Math.PI) : radResult;
        break;
      }
      case 'neg':
        result = -val;
        break;
      case 'pct':
        result = val / 100;
        break;
      default:
        return;
    }

    setDisplay(formatDisplay(result));
    setShouldReset(true);
  };

  const handleConstant = (constant: 'pi' | 'e') => {
    const val = constant === 'pi' ? Math.PI : Math.E;
    setDisplay(formatDisplay(val));
    setShouldReset(false);
  };

  // Sync keyboard shortcuts to match physical buttons for computer based testing (CBT) simulations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      const key = e.key;
      if (/\d/.test(key)) {
        handleDigit(key);
      } else if (key === '.') {
        handleDigit('.');
      } else if (key === '+') {
        handleOperator('+');
      } else if (key === '-') {
        handleOperator('-');
      } else if (key === '*') {
        handleOperator('×');
      } else if (key === '/') {
        handleOperator('÷');
      } else if (key === '^') {
        handleOperator('^');
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        handleCalculate();
      } else if (key === 'Backspace') {
        handleBackspace();
      } else if (key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [display, equation, shouldReset]);

  return (
    <div id="cbt_virtual_calculator" className="bg-slate-900 border border-slate-700/85 rounded-2xl shadow-2xl p-4 w-80 text-white font-mono select-none border-t-4 border-t-indigo-600 transition-all duration-200">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] text-slate-300 font-extrabold tracking-wider uppercase font-sans">
            WAEC / GCE STANDARD CBT
          </span>
        </div>
        <button 
          onClick={onClose}
          id="btn_close_calculator"
          title="Minimize Calculator"
          className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-800"
        >
          <X size={15} />
        </button>
      </div>

      {/* Primary Mathematical Solar LCD Display Panel */}
      <div className="bg-slate-950 p-3.5 rounded-xl text-right mb-4 border border-slate-800/80 shadow-inner relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
        
        {/* CBT context bar */}
        <div className="flex justify-between items-center text-[8px] text-slate-500 font-black tracking-widest uppercase font-sans mb-1">
          <span className="bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">
            {angleMode} ACTIVE
          </span>
          <span className="text-indigo-400">
            NON-PROGRAMMABLE
          </span>
        </div>
        
        {/* Equation preview */}
        <div className="text-xs text-slate-400 min-h-[16px] truncate tracking-wide font-mono pr-0.5">
          {equation || '\u00A0'}
        </div>
        
        {/* Main interactive display */}
        <div className="text-2xl font-bold truncate tracking-tight text-indigo-50 font-mono mt-1 pr-0.5">
          {display}
        </div>
      </div>

      {/* Ergonomic 5-Column Scientific Keyboard Layout */}
      <div className="grid grid-cols-5 gap-1.5 text-xs">
        
        {/* ROW 1 */}
        <button 
          id="btn_calc_angle_mode"
          title="Toggle Angle Mode (Degrees / Radians)"
          onClick={() => setAngleMode(angleMode === 'DEG' ? 'RAD' : 'DEG')}
          className="bg-indigo-950 hover:bg-indigo-900 text-indigo-300 font-bold p-2.5 rounded-lg transition-colors cursor-pointer flex flex-col items-center justify-center text-[9px] hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="text-[7px] text-indigo-400">DEG/RAD</span>
          <strong>{angleMode}</strong>
        </button>
        <button 
          id="btn_calc_bracket_open"
          onClick={handleBracketOpen}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold p-2.5 rounded-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          (
        </button>
        <button 
          id="btn_calc_bracket_close"
          onClick={handleBracketClose}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold p-2.5 rounded-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          )
        </button>
        <button 
          id="btn_calc_backspace"
          title="Backspace"
          onClick={handleBackspace}
          className="bg-rose-950 hover:bg-rose-900 text-rose-300 p-2.5 rounded-lg flex items-center justify-center transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <Delete size={14} />
        </button>
        <button 
          id="btn_calc_clear"
          title="Clear display state"
          onClick={handleClear}
          className="bg-red-650 hover:bg-red-550 text-white font-black p-2.5 rounded-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          C
        </button>

        {/* ROW 2 */}
        <button 
          id="btn_calc_sin"
          onClick={() => applyUnaryFunction('sin')}
          className="bg-slate-800 hover:bg-slate-750 text-indigo-300 font-medium p-2.5 rounded-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] text-[10px]"
        >
          sin
        </button>
        <button 
          id="btn_calc_cos"
          onClick={() => applyUnaryFunction('cos')}
          className="bg-slate-800 hover:bg-slate-750 text-indigo-300 font-medium p-2.5 rounded-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] text-[10px]"
        >
          cos
        </button>
        <button 
          id="btn_calc_tan"
          onClick={() => applyUnaryFunction('tan')}
          className="bg-slate-800 hover:bg-slate-750 text-indigo-300 font-medium p-2.5 rounded-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] text-[10px]"
        >
          tan
        </button>
        <button 
          id="btn_calc_pow"
          onClick={() => handleOperator('^')}
          className="bg-slate-800 hover:bg-slate-750 text-indigo-300 font-medium p-2.5 rounded-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          ^
        </button>
        <button 
          id="btn_calc_pct"
          onClick={() => applyUnaryFunction('pct')}
          className="bg-amber-600/85 hover:bg-amber-500 text-slate-950 font-bold p-2.5 rounded-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          %
        </button>

        {/* ROW 3 */}
        <button 
          id="btn_calc_asin"
          onClick={() => applyUnaryFunction('asin')}
          className="bg-slate-800 hover:bg-slate-750 text-indigo-400 font-medium p-2.5 rounded-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] text-[8px] flex flex-col items-center justify-center font-bold"
        >
          sin⁻¹
        </button>
        <button 
          id="btn_calc_acos"
          onClick={() => applyUnaryFunction('acos')}
          className="bg-slate-800 hover:bg-slate-750 text-indigo-400 font-medium p-2.5 rounded-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] text-[8px] flex flex-col items-center justify-center font-bold"
        >
          cos⁻¹
        </button>
        <button 
          id="btn_calc_atan"
          onClick={() => applyUnaryFunction('atan')}
          className="bg-slate-800 hover:bg-slate-750 text-indigo-400 font-medium p-2.5 rounded-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] text-[8px] flex flex-col items-center justify-center font-bold"
        >
          tan⁻¹
        </button>
        <button 
          id="btn_calc_sqrt"
          onClick={() => applyUnaryFunction('sqrt')}
          className="bg-slate-800 hover:bg-slate-750 text-indigo-300 font-medium p-2.5 rounded-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          √
        </button>
        <button 
          id="btn_calc_divide"
          onClick={() => handleOperator('÷')}
          className="bg-amber-600/85 hover:bg-amber-500 text-slate-950 font-black p-2.5 rounded-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] text-sm"
        >
          ÷
        </button>

        {/* ROW 4 */}
        <button 
          id="btn_calc_sqr"
          onClick={() => applyUnaryFunction('sqr')}
          className="bg-slate-800 hover:bg-slate-750 text-indigo-300 font-medium p-2.5 rounded-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] text-[10px]"
        >
          x²
        </button>
        <button 
          id="btn_calc_digit_7"
          onClick={() => handleDigit('7')}
          className="bg-slate-700/85 hover:bg-slate-650 text-white font-bold p-2.5 rounded-lg text-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          7
        </button>
        <button 
          id="btn_calc_digit_8"
          onClick={() => handleDigit('8')}
          className="bg-slate-700/85 hover:bg-slate-650 text-white font-bold p-2.5 rounded-lg text-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          8
        </button>
        <button 
          id="btn_calc_digit_9"
          onClick={() => handleDigit('9')}
          className="bg-slate-700/85 hover:bg-slate-650 text-white font-bold p-2.5 rounded-lg text-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          9
        </button>
        <button 
          id="btn_calc_multiply"
          onClick={() => handleOperator('×')}
          className="bg-amber-600/85 hover:bg-amber-500 text-slate-950 font-black p-2.5 rounded-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] text-sm"
        >
          ×
        </button>

        {/* ROW 5 */}
        <button 
          id="btn_calc_log"
          onClick={() => applyUnaryFunction('log')}
          className="bg-slate-800 hover:bg-slate-750 text-indigo-300 font-medium p-2.5 rounded-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] text-[10px]"
        >
          log
        </button>
        <button 
          id="btn_calc_digit_4"
          onClick={() => handleDigit('4')}
          className="bg-slate-700/85 hover:bg-slate-650 text-white font-bold p-2.5 rounded-lg text-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          4
        </button>
        <button 
          id="btn_calc_digit_5"
          onClick={() => handleDigit('5')}
          className="bg-slate-700/85 hover:bg-slate-650 text-white font-bold p-2.5 rounded-lg text-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          5
        </button>
        <button 
          id="btn_calc_digit_6"
          onClick={() => handleDigit('6')}
          className="bg-slate-700/85 hover:bg-slate-650 text-white font-bold p-2.5 rounded-lg text-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          6
        </button>
        <button 
          id="btn_calc_subtract"
          onClick={() => handleOperator('-')}
          className="bg-amber-600/85 hover:bg-amber-500 text-slate-950 font-black p-2.5 rounded-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] text-sm"
        >
          -
        </button>

        {/* ROW 6 */}
        <button 
          id="btn_calc_ln"
          onClick={() => applyUnaryFunction('ln')}
          className="bg-slate-800 hover:bg-slate-750 text-indigo-300 font-medium p-2.5 rounded-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] text-[10px]"
        >
          ln
        </button>
        <button 
          id="btn_calc_digit_1"
          onClick={() => handleDigit('1')}
          className="bg-slate-700/85 hover:bg-slate-650 text-white font-bold p-2.5 rounded-lg text-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          1
        </button>
        <button 
          id="btn_calc_digit_2"
          onClick={() => handleDigit('2')}
          className="bg-slate-700/85 hover:bg-slate-650 text-white font-bold p-2.5 rounded-lg text-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          2
        </button>
        <button 
          id="btn_calc_digit_3"
          onClick={() => handleDigit('3')}
          className="bg-slate-700/85 hover:bg-slate-650 text-white font-bold p-2.5 rounded-lg text-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          3
        </button>
        <button 
          id="btn_calc_add"
          onClick={() => handleOperator('+')}
          className="bg-amber-600/85 hover:bg-amber-500 text-slate-950 font-black p-2.5 rounded-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] text-sm"
        >
          +
        </button>

        {/* ROW 7 */}
        <button 
          id="btn_calc_const_pi"
          title="PI Constant"
          onClick={() => handleConstant('pi')}
          className="bg-slate-800 hover:bg-slate-750 text-indigo-300 font-medium p-2.5 rounded-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] text-xs flex items-center justify-center"
        >
          π
        </button>
        <button 
          id="btn_calc_negate"
          title="Negate Value"
          onClick={() => applyUnaryFunction('neg')}
          className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium p-2.5 rounded-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          ±
        </button>
        <button 
          id="btn_calc_digit_0"
          onClick={() => handleDigit('0')}
          className="bg-slate-700/85 hover:bg-slate-650 text-white font-bold p-2.5 rounded-lg text-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          0
        </button>
        <button 
          id="btn_calc_decimal"
          onClick={() => handleDigit('.')}
          className="bg-slate-750 hover:bg-slate-650 text-white font-bold p-2.5 rounded-lg text-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          .
        </button>
        <button 
          id="btn_calc_equals"
          onClick={handleCalculate}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black p-2.5 rounded-lg transition-all cursor-pointer hover:scale-[1.05] active:scale-[0.95] text-sm shadow-md"
        >
          =
        </button>
      </div>
    </div>
  );
}

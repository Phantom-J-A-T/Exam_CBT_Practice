import { useState } from 'react';
import { X, Delete } from 'lucide-react';

interface CbtCalculatorProps {
  onClose: () => void;
}

export default function CbtCalculator({ onClose }: CbtCalculatorProps) {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [shouldReset, setShouldReset] = useState(false);

  const handleDigit = (digit: string) => {
    if (display === '0' || shouldReset) {
      setDisplay(digit);
      setShouldReset(false);
    } else {
      setDisplay(display + digit);
    }
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setShouldReset(true);
  };

  const handleCalculate = () => {
    if (!equation) return;
    try {
      const fullExpression = equation + display;
      // Sanitize input to only allow simple mathematical operators
      const sanitized = fullExpression.replace(/[^-()\d/*+.]/g, '');
      // Evaluate mathematical expression safely
      // eslint-disable-next-line no-eval
      const result = eval(sanitized);
      setDisplay(Number(result).toLocaleString('en-US', { maximumFractionDigits: 6 }));
      setEquation('');
      setShouldReset(true);
    } catch {
      setDisplay('Error');
      setEquation('');
      setShouldReset(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setShouldReset(false);
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleSquareRoot = () => {
    try {
      const val = parseFloat(display.replace(/,/g, ''));
      if (val < 0) {
        setDisplay('Error');
      } else {
        setDisplay(Math.sqrt(val).toLocaleString('en-US', { maximumFractionDigits: 6 }));
      }
      setShouldReset(true);
    } catch {
      setDisplay('Error');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 w-64 text-white font-mono select-none">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-slate-400 font-semibold tracking-wider">CBT CALCULATOR</span>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-800"
        >
          <X size={16} />
        </button>
      </div>

      <div className="bg-slate-950 p-3 rounded-lg text-right mb-4 border border-slate-800">
        <div className="text-xs text-slate-500 h-4 truncate">{equation}</div>
        <div className="text-2xl font-bold truncate tracking-tight">{display}</div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {/* Row 1 */}
        <button onClick={handleClear} className="col-span-2 bg-red-950 hover:bg-red-900 text-red-400 font-bold p-3 rounded-lg transition-colors text-sm">C</button>
        <button onClick={handleBackspace} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-lg flex items-center justify-center transition-colors">
          <Delete size={16} />
        </button>
        <button onClick={() => handleOperator('/')} className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold p-3 rounded-lg transition-colors">/</button>

        {/* Row 2 */}
        <button onClick={() => handleDigit('7')} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-lg font-bold transition-colors">7</button>
        <button onClick={() => handleDigit('8')} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-lg font-bold transition-colors">8</button>
        <button onClick={() => handleDigit('9')} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-lg font-bold transition-colors">9</button>
        <button onClick={() => handleOperator('*')} className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold p-3 rounded-lg transition-colors">*</button>

        {/* Row 3 */}
        <button onClick={() => handleDigit('4')} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-lg font-bold transition-colors">4</button>
        <button onClick={() => handleDigit('5')} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-lg font-bold transition-colors">5</button>
        <button onClick={() => handleDigit('6')} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-lg font-bold transition-colors">6</button>
        <button onClick={() => handleOperator('-')} className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold p-3 rounded-lg transition-colors">-</button>

        {/* Row 4 */}
        <button onClick={() => handleDigit('1')} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-lg font-bold transition-colors">1</button>
        <button onClick={() => handleDigit('2')} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-lg font-bold transition-colors">2</button>
        <button onClick={() => handleDigit('3')} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-lg font-bold transition-colors">3</button>
        <button onClick={() => handleOperator('+')} className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold p-3 rounded-lg transition-colors">+</button>

        {/* Row 5 */}
        <button onClick={handleSquareRoot} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-lg font-bold text-sm transition-colors">√</button>
        <button onClick={() => handleDigit('0')} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-lg font-bold transition-colors">0</button>
        <button onClick={() => handleDigit('.')} className="bg-slate-800 hover:bg-slate-700 p-3 rounded-lg font-bold transition-colors">.</button>
        <button onClick={handleCalculate} className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold p-3 rounded-lg transition-colors">=</button>
      </div>
    </div>
  );
}

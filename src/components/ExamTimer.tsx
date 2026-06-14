import { useEffect, useState, useRef } from 'react';
import { Clock, AlertTriangle, Play, Pause, FastForward } from 'lucide-react';

interface ExamTimerProps {
  timeRemainingSeconds: number;
  onTimeTick: (secondsLeft: number) => void;
  onTimeout: () => void;
  isActive: boolean;
  onAlertTriggered?: (isTriggered: boolean) => void;
}

export default function ExamTimer({
  timeRemainingSeconds,
  onTimeTick,
  onTimeout,
  isActive,
  onAlertTriggered
}: ExamTimerProps) {
  // We want to track continuous practice time to alarm every 20 minutes.
  // 20 minutes = 1200 seconds.
  const ALERT_INTERVAL_SECONDS = 1200;
  
  const [cumulativeSeconds, setCumulativeSeconds] = useState(0);
  const [show20MinAlert, setShow20MinAlert] = useState(false);
  const [isDemoMultiplierActive, setIsDemoMultiplierActive] = useState(false);
  
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sound generator using Web Audio API (completely native & offline-safe)
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 150);
    } catch (e) {
      console.log('Audio Context muted or blocked by browser gesture rules');
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isActive) {
      intervalId = setInterval(() => {
        // Handle timer speed multiplier for quick testing
        const step = isDemoMultiplierActive ? 60 : 1; // 1 second acts as 1 minute if demo speedup is on

        // 1. Manage simulated exam countdown
        const nextTimeRemaining = Math.max(0, timeRemainingSeconds - step);
        onTimeTick(nextTimeRemaining);

        // 2. Track global cumulative study time for the 20-minute notification
        setCumulativeSeconds(prev => {
          const nextVal = prev + step;
          
          // Trigger alert exactly when a multiple of 20 minutes (1200s) has passed
          const currentMultiple = Math.floor(prev / ALERT_INTERVAL_SECONDS);
          const nextMultiple = Math.floor(nextVal / ALERT_INTERVAL_SECONDS);
          
          if (nextMultiple > currentMultiple) {
            triggerAlertNotification();
          }
          return nextVal;
        });

        if (nextTimeRemaining <= 0) {
          onTimeout();
          if (intervalId) clearInterval(intervalId);
        }
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isActive, timeRemainingSeconds, isDemoMultiplierActive]);

  const triggerAlertNotification = () => {
    setShow20MinAlert(true);
    playAlertSound();
    if (onAlertTriggered) onAlertTriggered(true);

    // Auto dismiss after 12 seconds
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    alertTimeoutRef.current = setTimeout(() => {
      setShow20MinAlert(false);
      if (onAlertTriggered) onAlertTriggered(false);
    }, 12000);
  };

  const handleSimulateAlert = () => {
    // Manually trigger the elegant blinking pop-out
    triggerAlertNotification();
  };

  // Turn time seconds to string
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours > 0 ? hours.toString().padStart(2, '0') + ':' : ''}${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Cumulative timer display calculated from cumulativeSeconds
  const formatCumulative = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="relative">
      {/* Compact Exam Timer showing only numbers & micro-controls */}
      <div className="bg-slate-900 text-white rounded-lg border border-slate-700 px-3 py-1.5 shadow-md flex items-center space-x-2.5 select-none font-mono">
        <Clock className={`w-4 h-4 text-indigo-400 ${isActive ? 'animate-pulse' : ''}`} />
        <span className="text-lg font-bold text-indigo-300 tracking-tight">
          {formatTime(timeRemainingSeconds)}
        </span>

        {/* Tiny helpers to accelerate for testing or trigger warning */}
        <div className="flex items-center space-x-1 border-l border-slate-800 pl-2">
          <button
            onClick={() => setIsDemoMultiplierActive(!isDemoMultiplierActive)}
            title="Accelerate timer countdown for testing"
            className={`h-5 px-1 rounded text-[8px] font-bold transition-all flex items-center gap-0.5 cursor-pointer ${
              isDemoMultiplierActive 
                ? 'bg-amber-500 text-slate-950' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <FastForward size={8} />
            {isDemoMultiplierActive ? 'FAST' : 'NORM'}
          </button>
          
          <button
            onClick={handleSimulateAlert}
            title="Test 20-min quarter-hour warning pop-out"
            className="bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 h-5 px-1 rounded text-[8px] font-bold transition-colors cursor-pointer"
          >
            ALERT TEST
          </button>
        </div>
      </div>

      {/* Pop-out 20-minute notification aligned to top-right corner over content */}
      {show20MinAlert && (
        <div 
          id="quarter-hour-alert"
          className="fixed top-6 right-6 z-50 max-w-sm bg-gradient-to-r from-amber-600 to-amber-700 text-slate-950 p-4 rounded-xl shadow-2xl border-2 border-yellow-200 animate-bounce cursor-pointer flex items-start gap-4"
          style={{ animationDuration: '3s' }}
          onClick={() => setShow20MinAlert(false)}
        >
          {/* Gentle custom blinking light indicating a quarter/third of an hour */}
          <span className="relative flex h-3 w-3 mt-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
          </span>

          <div className="flex-1">
            <div className="flex justify-between items-start">
              <span className="font-bold text-sm tracking-tight text-white uppercase flex items-center gap-1">
                <AlertTriangle size={15} />
                TIME WARNING
              </span>
              <button 
                onClick={(e) => { e.stopPropagation(); setShow20MinAlert(false); }}
                className="text-white opacity-80 hover:opacity-100 text-xs font-bold leading-none"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-yellow-50 font-medium leading-relaxed mt-1">
              A quarter of an hour has passed! Keep managing your time wisely to finish all your questions.
            </p>
            <div className="mt-2 text-[9px] font-mono text-yellow-200 uppercase tracking-widest bg-amber-900/30 px-1.5 py-0.5 rounded inline-block">
              Session Duration: {formatCumulative(cumulativeSeconds)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

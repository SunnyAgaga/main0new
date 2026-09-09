import { useEffect, useState } from 'react';

interface TimeRemaining {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeRemaining(targetDate: string): TimeRemaining {
  const total = Math.max(0, new Date(targetDate).getTime() - Date.now());
  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}

export function Countdown({ targetDate }: { targetDate: string }) {
  const [time, setTime] = useState(() => getTimeRemaining(targetDate));

  useEffect(() => {
    setTime(getTimeRemaining(targetDate));
    const interval = setInterval(() => {
      setTime(getTimeRemaining(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (time.total <= 0) {
    return (
      <p className="text-lg font-serif font-semibold text-primary">
        Today is the day!
      </p>
    );
  }

  const units: { label: string; value: number }[] = [
    { label: 'Days', value: time.days },
    { label: 'Hours', value: time.hours },
    { label: 'Minutes', value: time.minutes },
    { label: 'Seconds', value: time.seconds },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
      {units.map((unit) => (
        <div
          key={unit.label}
          className="flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl border border-primary/20 bg-card shadow-sm"
        >
          <span className="text-xl sm:text-2xl font-serif font-bold text-primary tabular-nums">
            {String(unit.value).padStart(2, '0')}
          </span>
          <span className="text-[9px] sm:text-[10px] uppercase tracking-wide text-muted-foreground">
            {unit.label}
          </span>
        </div>
      ))}
    </div>
  );
}

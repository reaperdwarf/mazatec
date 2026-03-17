import { useState, useEffect } from 'react';

export const useRootingTimer = (startDate: Date | undefined) => {
  const [daysElapsed, setDaysElapsed] = useState(0);

  useEffect(() => {
    if (!startDate) return;
    
    const update = () => {
      const diff = Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      setDaysElapsed(diff);
    };

    update();
    const interval = setInterval(update, 1000 * 60 * 60); // Update every hour
    return () => clearInterval(interval);
  }, [startDate]);

  const phase = daysElapsed <= 14 ? 'Root Development' : 'Hardening Off';
  const progress = Math.min((daysElapsed / 28) * 100, 100);

  return { daysElapsed, phase, progress, isComplete: daysElapsed >= 28 };
};

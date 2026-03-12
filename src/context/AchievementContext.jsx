import { createContext, useContext, useState, useCallback } from "react";
import { checkAchievements } from "../utils/achievements";
import AchievementToast from "../components/AchievementToast";

const AchievementContext = createContext();

export function AchievementProvider({ children }) {
  const [toastQueue, setToastQueue] = useState([]);

  const triggerCheck = useCallback(async (userId, action) => {
    const newKeys = await checkAchievements(userId, action);
    if (newKeys.length > 0) {
      setToastQueue(prev => [...prev, ...newKeys]);
    }
  }, []);

  const dismissToast = () => {
    setToastQueue(prev => prev.slice(1));
  };

  return (
    <AchievementContext.Provider value={{ triggerCheck }}>
      {children}
      {toastQueue.length > 0 && (
        <AchievementToast
          key={toastQueue[0]}
          achievementKey={toastQueue[0]}
          onDone={dismissToast}
        />
      )}
    </AchievementContext.Provider>
  );
}

export function useAchievements() {
  return useContext(AchievementContext);
}
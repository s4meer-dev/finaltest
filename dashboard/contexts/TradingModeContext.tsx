"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type TradingMode = "test" | "live";

interface TradingModeContextValue {
  mode: TradingMode;
  setMode: (mode: TradingMode) => void;
  dialogError: string | null;
  setDialogError: (msg: string | null) => void;
  showDialog: boolean;
  setShowDialog: (v: boolean) => void;
}

const TradingModeContext = createContext<TradingModeContextValue | null>(null);

export function TradingModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeInternal] = useState<TradingMode>("live");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const setMode = useCallback((newMode: TradingMode) => {
    setModeInternal(newMode);
  }, []);

  return (
    <TradingModeContext.Provider value={{ mode, setMode, dialogError, setDialogError, showDialog, setShowDialog }}>
      {children}
    </TradingModeContext.Provider>
  );
}

export function useTradingMode() {
  const ctx = useContext(TradingModeContext);
  if (!ctx) throw new Error("useTradingMode must be used within TradingModeProvider");
  return ctx;
}

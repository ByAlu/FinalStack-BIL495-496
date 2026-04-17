import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import { registerGlobalErrorToast } from "../services/errorToastBus";

const ToastContext = createContext(null);

const TOAST_DURATION_MS = 5000;

export function ToastProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState("error");
  const [toastKey, setToastKey] = useState(0);

  const showToast = useCallback((msg, variant = "error") => {
    setMessage(msg);
    setSeverity(variant);
    setToastKey((key) => key + 1);
    setOpen(true);
  }, []);

  const showError = useCallback((msg) => showToast(msg, "error"), [showToast]);

  useEffect(() => {
    registerGlobalErrorToast(showError);
    return () => registerGlobalErrorToast(null);
  }, [showError]);

  const handleClose = useCallback((_, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setOpen(false);
  }, []);

  const value = useMemo(() => ({ showToast, showError }), [showToast, showError]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        key={toastKey}
        open={open}
        autoHideDuration={TOAST_DURATION_MS}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{ mt: 1 }}
      >
        <Alert
          onClose={handleClose}
          severity={severity}
          variant="filled"
          elevation={6}
          sx={{ width: "100%", maxWidth: { xs: "92vw", sm: 420 } }}
        >
          {message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

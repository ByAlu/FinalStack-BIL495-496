import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#2fc8d8"
    },
    secondary: {
      main: "#58a6ff"
    },
    background: {
      default: "#071628",
      paper: "#0b1d31"
    },
    text: {
      primary: "#e6edf5",
      secondary: "#94a8bf"
    },
    success: {
      main: "#4ade80"
    }
  },
  shape: {
    borderRadius: 20
  },
  typography: {
    fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
    h2: {
      fontWeight: 800
    },
    h3: {
      fontWeight: 800
    },
    h4: {
      fontWeight: 800
    },
    button: {
      fontWeight: 700,
      textTransform: "none"
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            "radial-gradient(circle at top, rgba(47, 200, 216, 0.14), transparent 28%), linear-gradient(180deg, #071628 0%, #08182b 100%)"
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid rgba(148, 197, 255, 0.12)"
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(148, 197, 255, 0.12)",
          background: "rgba(11, 29, 49, 0.9)",
          backdropFilter: "blur(18px)"
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 16
        }
      }
    }
  }
});

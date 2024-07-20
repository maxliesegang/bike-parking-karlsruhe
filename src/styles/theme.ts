import { createTheme } from "@mui/material";

const theme = createTheme({
  palette: {
    primary: {
      main: "#005538",
    },
    secondary: {
      main: "#dc004e",
    },
    background: {
      default: "#F5F1E9",
      paper: "#FFFFFF",
    },
  },
  typography: {
    fontFamily: '"PT Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: "2.5rem",
      fontWeight: 700,
      marginBottom: "1.5rem",
      color: "#005538",
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 600,
      marginBottom: "1rem",
      color: "#005538",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap');
      `,
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          maxWidth: "1800px !important",
          padding: "0 16px",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          borderRadius: "8px",
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          marginBottom: "2rem",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: "12px 16px",
          "@media (max-width: 600px)": {
            padding: "8px 12px",
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:nth-of-type(even)": {
            backgroundColor: "#F9F7F3",
          },
          "&:hover": {
            backgroundColor: "#EAE6DE",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "8px 16px",
          fontWeight: 700,
          textTransform: "none",
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: "#005538",
          textDecoration: "none",
          "&:hover": {
            textDecoration: "underline",
          },
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        h1: {
          fontSize: "2.5rem",
          "@media (max-width: 600px)": {
            fontSize: "2rem",
          },
        },
        h2: {
          fontSize: "2rem",
          "@media (max-width: 600px)": {
            fontSize: "1.75rem",
          },
        },
      },
    },
  },
});

export default theme;

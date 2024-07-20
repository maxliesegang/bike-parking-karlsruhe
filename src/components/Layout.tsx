// File: src/components/Layout.tsx
import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Übersicht" },
    { href: "/gemeinden", label: "Gemeinden" },
    { href: "/br-stations", label: "B+R Stationen" },
    { href: "/about", label: "Über die Daten" },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return router.pathname === href;
    }
    return router.pathname.startsWith(href);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <List>
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} passHref>
          <ListItem
            button
            onClick={handleDrawerToggle}
            selected={isActive(item.href)}
          >
            <ListItemText primary={item.label} />
          </ListItem>
        </Link>
      ))}
    </List>
  );

  return (
    <>
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, fontWeight: "bold", color: "white" }}
          >
            Fahrrad-Abstellanlagen
          </Typography>
          <Box sx={{ display: { xs: "none", sm: "flex" }, gap: 2 }}>
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} passHref>
                <Button
                  sx={{
                    color: "white",
                    fontWeight: "bold",
                    borderRadius: 2,
                    padding: "6px 16px",
                    backgroundColor: isActive(item.href)
                      ? "rgba(255, 255, 255, 0.2)"
                      : "transparent",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                    },
                  }}
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </Box>
        </Toolbar>
      </AppBar>
      <Box component="nav">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: 240 },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <main>{children}</main>
      </Container>
    </>
  );
};

export default Layout;

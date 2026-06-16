import { ReactNode, useState, useRef } from "react";
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
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import Link from "next/link";
import { useRouter } from "next/router";

const mainNavItems = [{ href: "/", label: "Übersicht" }];

const analyseNavItems = [
  { href: "/gemeinden", label: "Gemeinden" },
  { href: "/br-stations", label: "B+R Stationen" },
];

const aboutNavItems = [{ href: "/about", label: "Über die Daten" }];

const navButtonSx = (active: boolean) => ({
  color: "white",
  fontWeight: "bold",
  borderRadius: 2,
  padding: "6px 16px",
  backgroundColor: active ? "rgba(255, 255, 255, 0.2)" : "transparent",
  "&:hover": {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
});

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [analyseAnchorEl, setAnalyseAnchorEl] = useState<null | HTMLElement>(null);
  const analyseOpen = Boolean(analyseAnchorEl);

  const isActive = (href: string) =>
    href === "/" ? router.pathname === href : router.pathname.startsWith(href);

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);

  const allNavItems = [
    ...mainNavItems,
    ...analyseNavItems,
    ...aboutNavItems,
  ];

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
          <Box sx={{ display: { xs: "none", sm: "flex" }, gap: 2, alignItems: "center" }}>
            {mainNavItems.map((item) => (
              <Button
                key={item.href}
                component={Link}
                href={item.href}
                sx={navButtonSx(isActive(item.href))}
              >
                {item.label}
              </Button>
            ))}

            <Button
              onClick={(e) => setAnalyseAnchorEl(e.currentTarget)}
              sx={navButtonSx(
                analyseNavItems.some((item) => isActive(item.href)),
              )}
              endIcon={<ArrowDropDownIcon />}
            >
              Stadtanalyse
            </Button>
            <Menu
              anchorEl={analyseAnchorEl}
              open={analyseOpen}
              onClose={() => setAnalyseAnchorEl(null)}
            >
              {analyseNavItems.map((item) => (
                <MenuItem
                  key={item.href}
                  component={Link}
                  href={item.href}
                  onClick={() => setAnalyseAnchorEl(null)}
                  selected={isActive(item.href)}
                >
                  {item.label}
                </MenuItem>
              ))}
            </Menu>

            {aboutNavItems.map((item) => (
              <Button
                key={item.href}
                component={Link}
                href={item.href}
                sx={navButtonSx(isActive(item.href))}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </AppBar>
      <Box component="nav">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: 240 },
          }}
        >
          <List>
            {mainNavItems.map((item) => (
              <ListItem key={item.href} disablePadding>
                <ListItemButton
                  component={Link}
                  href={item.href}
                  onClick={handleDrawerToggle}
                  selected={isActive(item.href)}
                >
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}

            <ListItem sx={{ pl: 2, pt: 2 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: "bold", letterSpacing: 1 }}
              >
                STADTANALYSE
              </Typography>
            </ListItem>
            {analyseNavItems.map((item) => (
              <ListItem key={item.href} disablePadding sx={{ pl: 2 }}>
                <ListItemButton
                  component={Link}
                  href={item.href}
                  onClick={handleDrawerToggle}
                  selected={isActive(item.href)}
                >
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}

            <ListItem sx={{ mt: 1 }} disablePadding>
              <ListItemButton
                component={Link}
                href="/about"
                onClick={handleDrawerToggle}
                selected={isActive("/about")}
              >
                <ListItemText primary="Über die Daten" />
              </ListItemButton>
            </ListItem>
          </List>
        </Drawer>
      </Box>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <main>{children}</main>
      </Container>
    </>
  );
}

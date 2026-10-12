import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  fonts: {
    heading: "'Inter Variable', system-ui, sans-serif",
    body: "'Inter Variable', system-ui, sans-serif",
  },
  colors: {
    brand: {
      50: "#eef7f6",
      100: "#d3ecea",
      200: "#a8d9d4",
      300: "#74c0b9",
      400: "#44a39c",
      500: "#2a8781",
      600: "#1f6d68",
      700: "#1b5854",
      800: "#184845",
      900: "#163c3a",
    },
  },
  styles: {
    global: {
      body: {
        bg: "gray.50",
        color: "gray.800",
      },
    },
  },
  components: {
    Button: { defaultProps: { colorScheme: "brand" } },
  },
});

export default theme;

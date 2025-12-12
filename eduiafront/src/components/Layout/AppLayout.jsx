import { Box } from "@chakra-ui/react";

const AppLayout = ({ children }) => {
  return (
    <Box
      maxW="100vw"
      height="70vh"
      mx="auto"
      p="4"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      gap="4"
      mt="4rem"
    >
      {children}
    </Box>
  );
};

export default AppLayout;

import {
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spacer,
  Text,
  useBreakpointValue
} from "@chakra-ui/react";
import { FaChevronDown } from "react-icons/fa";

const Navbar = ({
  isAuthenticated,
  onLogin,
  username,
  onLogout,
  onDashboard = () => {},
  onHome = () => {},
}) => {
  const marginX = useBreakpointValue({ base: "5px", md: "20px", lg: "40px" });

  return (
    <Flex
      as="nav"
      bg="teal.500"
      color="white"
      padding="1rem"
      alignItems="center"
      width="100vw"
      justifyContent="space-between"
      position="fixed"
      top="0"
      left="0"
      zIndex="1000"
    >
      <Text 
        fontSize="xl" 
        fontWeight="bold" 
        ml={marginX}
        onClick={onHome}
        cursor="pointer"
        _hover={{ textDecoration: 'underline' }}
      >
        EduIA
      </Text>
      <Spacer />
      {isAuthenticated ? (
        <Menu>
          <MenuButton
            as={Button}
            rightIcon={<FaChevronDown />}
            variant="outline"
            colorScheme="teal"
          >
            {username || "User"}
          </MenuButton>
          <MenuList>
            <MenuItem onClick={onDashboard} textColor={"green.400"}>
              Dashboard
            </MenuItem>
            {/* Wrap onLogout call to ensure it's a function */}
            <MenuItem onClick={() => onLogout && onLogout()} textColor={"red.400"}>
              Logout
            </MenuItem>
          </MenuList>
        </Menu>
      ) : (
        <Button
          colorScheme="teal"
          variant="outline"
          onClick={onLogin}
          mr={marginX}
        >
          Login
        </Button>
      )}
    </Flex>
  );
};

export default Navbar;

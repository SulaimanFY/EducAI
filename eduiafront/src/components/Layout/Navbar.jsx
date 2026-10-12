import {
  Avatar,
  Box,
  Button,
  Flex,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
} from "@chakra-ui/react";
import { FaChevronDown } from "react-icons/fa";
import { FiGrid, FiLogOut } from "react-icons/fi";

export const Logo = ({ onClick, color = "gray.900" }) => (
  <HStack spacing={2} cursor={onClick ? "pointer" : "default"} onClick={onClick}>
    <Flex
      w="32px"
      h="32px"
      borderRadius="lg"
      bg="brand.500"
      color="white"
      align="center"
      justify="center"
      fontWeight="800"
      fontSize="sm"
    >
      E
    </Flex>
    <Text fontSize="xl" fontWeight="700" letterSpacing="-0.02em" color={color}>
      Educ<Box as="span" color="brand.500">AI</Box>
    </Text>
  </HStack>
);

const Navbar = ({
  isAuthenticated,
  onLogin,
  username,
  onLogout,
  onDashboard = () => {},
  onHome = () => {},
}) => {
  return (
    <Flex
      as="nav"
      bg="white"
      borderBottom="1px solid"
      borderColor="gray.200"
      px={{ base: 4, md: 8 }}
      h="64px"
      alignItems="center"
      justifyContent="space-between"
      position="fixed"
      top="0"
      left="0"
      right="0"
      zIndex="1000"
    >
      <Logo onClick={onHome} />
      {isAuthenticated ? (
        <HStack spacing={3}>
          <Button leftIcon={<FiGrid />} variant="ghost" size="sm" onClick={onDashboard}>
            Dashboard
          </Button>
          <Menu>
            <MenuButton
              as={Button}
              variant="ghost"
              colorScheme="gray"
              size="sm"
              rightIcon={<FaChevronDown />}
            >
              <HStack spacing={2}>
                <Avatar size="xs" name={username} bg="brand.500" color="white" />
                <Text>{username || "User"}</Text>
              </HStack>
            </MenuButton>
            <MenuList>
              <MenuItem icon={<FiGrid />} onClick={onDashboard}>
                Dashboard
              </MenuItem>
              <MenuItem icon={<FiLogOut />} onClick={() => onLogout && onLogout()} color="red.500">
                Log out
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      ) : (
        <Button size="sm" onClick={onLogin}>
          Log in
        </Button>
      )}
    </Flex>
  );
};

export default Navbar;

import {
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Box,
    CloseButton,
    SlideFade,
    useDisclosure
} from "@chakra-ui/react";
import { useEffect, useState } from "react";

const EventMessage = ({ 
  message, 
  status = "success", 
  title = "", 
  isVisible = false, 
  autoHideDuration = 5000,
  position = "bottom-right",
  onClose
}) => {
  const { isOpen, onOpen, onClose: handleClose } = useDisclosure();
  const [timeoutId, setTimeoutId] = useState(null);

  // Handle visibility changes
  useEffect(() => {
    if (isVisible) {
      onOpen();
      
      // Auto-hide after duration if specified
      if (autoHideDuration > 0) {
        const id = setTimeout(() => {
          handleClose();
          if (onClose) onClose();
        }, autoHideDuration);
        
        setTimeoutId(id);
      }
    } else {
      handleClose();
    }
    
    // Cleanup timeout on unmount or status change
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isVisible, autoHideDuration, onClose]);

  // Position styles
  const getPositionStyles = () => {
    switch (position) {
      case "top":
        return { top: "20px", left: "50%", transform: "translateX(-50%)" };
      case "bottom":
        return { bottom: "20px", left: "50%", transform: "translateX(-50%)" };
      case "top-right":
        return { top: "20px", right: "20px" };
      case "top-left":
        return { top: "20px", left: "20px" };
      case "bottom-right":
        return { bottom: "20px", right: "20px" };
      case "bottom-left":
        return { bottom: "20px", left: "20px" };
      default:
        return { bottom: "20px", right: "20px" };
    }
  };

  const closeHandler = () => {
    handleClose();
    if (onClose) onClose();
  };

  return (
    <SlideFade in={isOpen} offsetY="20px">
      <Box
        position="fixed"
        zIndex={9999}
        maxWidth={{ base: "90%", md: "400px" }}
        {...getPositionStyles()}
      >
        <Alert
          status={status}
          variant="solid"
          flexDirection="column"
          alignItems="start"
          borderRadius="md"
          boxShadow="lg"
          p={4}
          mb={4}
        >
          <Box display="flex" width="100%" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center">
              <AlertIcon />
              {title && <AlertTitle mr={2}>{title}</AlertTitle>}
            </Box>
            <CloseButton size="sm" onClick={closeHandler} />
          </Box>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      </Box>
    </SlideFade>
  );
};

export default EventMessage; 
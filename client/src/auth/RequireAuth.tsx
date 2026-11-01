import { Alert, Button, Center, Loader, Stack, Text } from "@mantine/core";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "./AuthProvider";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status, enableDevPreview } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <Center h="100vh"><Loader /></Center>;
  }
  // Not a logout: signing in again cannot work while the IAM is unreachable.
  if (status === "unavailable") {
    return (
      <Center h="100vh" p="md">
        <Alert color="red" title="Cannot verify your session" maw={520}>
          <Stack gap="sm">
            <Text size="sm">
              The backend identity service at <code>http://127.0.0.1:8002</code> could not be reached (Django backend is not running).
            </Text>
            <Text size="xs" c="dimmed">
              You can start the backend with <code>python manage.py runserver 8002</code>, or enter preview mode to test the System Admin interface standalone:
            </Text>
            <Button
              mt="xs"
              variant="filled"
              color="blue"
              onClick={enableDevPreview}
            >
              Enter System Admin Preview Mode
            </Button>
          </Stack>
        </Alert>
      </Center>
    );
  }
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ next: location.pathname }} />;
  }
  return <>{children}</>;
}

import { Container, Stack, Title, Text, Card, Button } from "@mantine/core";
import { useNotifications, notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import { useEffect } from "react";

declare global {
  interface Window {
    EBWidgets?: {
      createWidget: (config: {
        widgetType: string;
        eventId: string;
        modal: boolean;
        modalTriggerElementId: string;
        onOrderComplete: () => void;
      }) => void;
    };
  }
}

export default function TicketsPage() {
  useEffect(() => {
    // Load Eventbrite widget script
    const script = document.createElement("script");
    script.src = "https://www.eventbrite.com.au/static/widgets/eb_widgets.js";
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      // Initialize widget after script loads
      if (!window.EBWidgets) return;

      window.EBWidgets.createWidget({
        widgetType: "checkout",
        eventId: "1813094407179",
        modal: true,
        modalTriggerElementId: "eventbrite-widget-modal-trigger-1813094407179",
        onOrderComplete: () => {
          console.log("Order complete!");
          notifications.show({
            title: "Order complete!",
            message: "Your order has been completed successfully",
            color: "green",
            icon: <IconCheck size={16} />,
          });
        },
      });
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Title order={1}>Tickets</Title>
        <Card withBorder radius="md" p="xl">
          <Stack gap="md" align="center">
            <Text size="lg" ta="center">
              Get your tickets for the 2025 Port Geographe Christmas Cruise!
            </Text>
            <Button
              id="eventbrite-widget-modal-trigger-1813094407179"
              size="lg"
              type="button"
            >
              Buy Tickets
            </Button>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}

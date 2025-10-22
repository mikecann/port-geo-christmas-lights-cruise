import { Box, Button, Container, Title } from "@mantine/core";
import { routes } from "../routes";

export default function BookNowSection() {
  return (
    <Box bg="#02051A" pb={20}>
      <Container size="sm">
        <Button
          component="a"
          {...routes.tickets().link}
          size="xl"
          radius="md"
          variant="filled"
          color="#C52630"
          fullWidth
          mt="md"
          styles={{
            root: {
              height: 80,
              fontSize: 24,
              fontWeight: 700,
            },
          }}
        >
          Book Tickets Now
        </Button>
      </Container>
    </Box>
  );
}

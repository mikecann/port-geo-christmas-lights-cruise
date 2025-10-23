import { Box, Text, Group, Container } from "@mantine/core";
import { SponsorLink } from "./SponsorLink";

const sponsors = [
  {
    href: "https://www.aigleroyal.com.au/",
    src: "/sponsors/Aigle Royal Group.jpg",
    alt: "Aigle Royal Group",
  },
  {
    href: "https://altairestate.com.au/",
    src: "/sponsors/Altair Logo.jpg",
    alt: "Altaire Estate",
  },
  {
    href: "https://www.busseltonmail.com.au/",
    src: "/sponsors/Busselton Dunsborough Mail Logo.jpg",
    alt: "Busselton Dunsborough Mail",
  },
  {
    href: "https://www.busselton.wa.gov.au/",
    src: "/sponsors/City of Busselton Logo.jpg",
    alt: "City of Busselton",
  },
  {
    href: "https://newportgeographe.com.au/",
    src: "/sponsors/Newport Geographe Logo.png",
    alt: "Newport Geographe",
  },
  {
    href: "https://www.portgeographemarina.com.au/",
    src: "/sponsors/Port Geographe Marina Logo.png",
    alt: "Port Geographe Marina",
  },
  {
    href: "http://www.raywhitestockerpreston.com.au/",
    src: "/sponsors/Ray White Stocker Preston Logo.png",
    alt: "Ray White Stocker Preston",
  },
  {
    href: "https://www.wintv.com.au/",
    src: "/sponsors/WIN Logo.png",
    alt: "WIN TV",
  },
];

export function Sponsors() {
  return (
    <Box>
      <Container size="lg">
        <Box
          maw={{ base: "95%", xs: "90%", sm: 800, lg: 800 }}
          style={{
            position: "relative",
            zIndex: 5,
            textAlign: "center",
            margin: "20px auto 40px",
            //maxWidth: "90%",
          }}
        >
          <Text
            style={{
              color: "#FBAF5D",
              fontSize: 18,
              marginBottom: 20,
              fontWeight: 600,
            }}
          >
            Proudly sponsored by
          </Text>
          <Group justify="center" gap={20}>
            {sponsors.map((sponsor) => (
              <SponsorLink
                key={sponsor.alt}
                href={sponsor.href}
                src={sponsor.src}
                alt={sponsor.alt}
              />
            ))}
          </Group>
        </Box>
      </Container>
    </Box>
  );
}

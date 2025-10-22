import { Box, Text, Group, Container } from "@mantine/core";
import { SponsorLink } from "./SponsorLink";

const sponsors = [
  {
    href: "https://www.aigleroyal.com.au/",
    src: "/sponsors/aigle-royal-group.jpg",
    alt: "Aigle Royal Group",
  },
  {
    href: "https://altairestate.com.au/",
    src: "/sponsors/Logo-Small.jpg",
    alt: "Altaire Estate",
  },
  {
    href: "https://www.busseltonmail.com.au/",
    src: "/sponsors/BDMail-2017-1.jpg",
    alt: "Busselton Mail",
  },
  {
    href: "https://www.busselton.wa.gov.au/",
    src: "/sponsors/city-of-busselton.jpg",
    alt: "City of Busselton",
  },
  {
    href: "https://www.dalealcock.com.au/south-west/",
    src: "/sponsors/dale-alcock-southwest.png",
    alt: "Dale Alcock South West",
  },
  {
    href: "https://newportgeographe.com.au/",
    src: "/sponsors/newport-e1573090532605.png",
    alt: "Newport Geographe",
  },
  {
    href: "http://www.pictoncivil.com.au/",
    src: "/sponsors/PC-JPEG-Logo-New-scaled.jpg",
    alt: "Picton Civil",
  },
  {
    href: "https://www.portgeographemarina.com.au/",
    src: "/sponsors/PG-Marina.png",
    alt: "Port Geographe Marina",
  },
  {
    href: "http://www.raywhitestockerpreston.com.au/",
    src: "/sponsors/raywhite-stocker-preston.png",
    alt: "Ray White Stocker Preston",
  },
  {
    href: "https://www.wintv.com.au/",
    src: "/sponsors/WIN-Logo.png",
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

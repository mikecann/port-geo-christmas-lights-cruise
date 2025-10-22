import { Anchor, Image } from "@mantine/core";

interface SponsorLinkProps {
  href: string;
  src: string;
  alt: string;
}

export function SponsorLink({ href, src, alt }: SponsorLinkProps) {
  return (
    <Anchor href={href}>
      <Image
        src={src}
        alt={alt}
        fit="contain"
        h={{ base: 50, xs: 50, sm: 60, md: 60, lg: 70 }}
        style={{
          width: "auto",
          borderRadius: 2,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          transition: "box-shadow 0.3s ease",
        }}
      />
    </Anchor>
  );
}

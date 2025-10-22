import * as React from "react";
import { Text, Box } from "@mantine/core";
import { routes } from "../../routes";

export const TopLogo: React.FC = () => {
  return (
    <>
      <style>{`
        .responsive-logo {
          text-decoration: none;
          color: inherit;
          position: relative;
        }
        
        @media (max-width: 425px) {
          .responsive-logo {
            transform: scale(0.7);
            transform-origin: left top;
          }
        }
      `}</style>
      <Box component="a" {...routes.home().link} className="responsive-logo">
        <img
          src="/title-no-year.webp"
          alt="Port Geographe"
          width={190}
          style={{
            position: "absolute",
            top: -28,
            left: 0,
            opacity: 1,
          }}
        />
      </Box>
    </>
  );
};

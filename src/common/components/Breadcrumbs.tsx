import { Breadcrumbs as MantineBreadcrumbs, Anchor, Text } from "@mantine/core";

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  isActive?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <MantineBreadcrumbs mb="md">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        if (isLast || item.isActive || !item.onClick)
          return (
            <Text key={index} c="dimmed" size="sm">
              {item.label}
            </Text>
          );

        return (
          <Anchor
            key={index}
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              item.onClick?.();
            }}
          >
            {item.label}
          </Anchor>
        );
      })}
    </MantineBreadcrumbs>
  );
}

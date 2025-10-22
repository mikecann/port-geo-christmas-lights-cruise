import { Group, Text, Select } from "@mantine/core";

interface PageSizeSelectorProps {
  pageSize: number;
  onPageSizeChange: (newSize: number) => void;
}

export default function PageSizeSelector({
  pageSize,
  onPageSizeChange,
}: PageSizeSelectorProps) {
  return (
    <Group gap="sm">
      <Text size="sm" c="dimmed">
        Rows per page:
      </Text>
      <Select
        data={["10", "25", "50", "100"]}
        value={pageSize.toString()}
        onChange={(newPageSize) => {
          if (!newPageSize) return;
          onPageSizeChange(Number(newPageSize));
        }}
        size="xs"
        w={70}
        withCheckIcon={false}
      />
    </Group>
  );
}

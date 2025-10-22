import { Group, ActionIcon, Pagination, Center } from "@mantine/core";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react";

interface VotesTablePaginationProps {
  page: number;
  maxPages: number;
  onPageChange: (page: number) => void;
}

export default function VotesTablePagination({
  page,
  maxPages,
  onPageChange,
}: VotesTablePaginationProps) {
  return (
    <Group justify="space-between">
      <Group gap="xs">
        <ActionIcon
          variant="subtle"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          title="First page"
        >
          <IconChevronsLeft size={16} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          title="Previous page"
        >
          <IconChevronLeft size={16} />
        </ActionIcon>
      </Group>

      <Center>
        <Pagination
          value={page}
          onChange={onPageChange}
          total={maxPages}
          size="sm"
          siblings={1}
          boundaries={1}
        />
      </Center>

      <Group gap="xs">
        <ActionIcon
          variant="subtle"
          disabled={page >= maxPages}
          onClick={() => onPageChange(Math.min(maxPages, page + 1))}
          title="Next page"
        >
          <IconChevronRight size={16} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          disabled={page >= maxPages}
          onClick={() => onPageChange(maxPages)}
          title="Last page"
        >
          <IconChevronsRight size={16} />
        </ActionIcon>
      </Group>
    </Group>
  );
}

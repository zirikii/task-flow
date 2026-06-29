'use client';

import { PRIORITY_ORDER } from '@taskflow/types';
import { Input, Select } from '@taskflow/ui';
import { PRIORITY_LABELS } from '../../lib/format';
import { trpc } from '../../lib/trpc';

export interface BoardFilters {
  query: string;
  assigneeId: string; // 'ALL' | 'UNASSIGNED' | userId
  priority: string; // 'ALL' | Priority
  labelId: string; // 'ALL' | labelId
}

export const DEFAULT_FILTERS: BoardFilters = {
  query: '',
  assigneeId: 'ALL',
  priority: 'ALL',
  labelId: 'ALL',
};

export function FilterBar({
  workspaceId,
  filters,
  onChange,
}: {
  workspaceId: string;
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
}) {
  const members = trpc.workspace.members.useQuery({ workspaceId });
  const labels = trpc.label.list.useQuery({ workspaceId });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="search"
        value={filters.query}
        onChange={(event) => onChange({ ...filters, query: event.target.value })}
        placeholder="Search tasks…"
        className="h-9 w-56"
        aria-label="Search tasks"
      />
      <Select
        value={filters.assigneeId}
        onChange={(event) => onChange({ ...filters, assigneeId: event.target.value })}
        className="h-9 w-40"
        aria-label="Filter by assignee"
      >
        <option value="ALL">All assignees</option>
        <option value="UNASSIGNED">Unassigned</option>
        {(members.data ?? []).map((member) => (
          <option key={member.user.id} value={member.user.id}>
            {member.user.name}
          </option>
        ))}
      </Select>
      <Select
        value={filters.priority}
        onChange={(event) => onChange({ ...filters, priority: event.target.value })}
        className="h-9 w-36"
        aria-label="Filter by priority"
      >
        <option value="ALL">All priorities</option>
        {PRIORITY_ORDER.map((value) => (
          <option key={value} value={value}>
            {PRIORITY_LABELS[value]}
          </option>
        ))}
      </Select>
      <Select
        value={filters.labelId}
        onChange={(event) => onChange({ ...filters, labelId: event.target.value })}
        className="h-9 w-36"
        aria-label="Filter by label"
      >
        <option value="ALL">All labels</option>
        {(labels.data ?? []).map((label) => (
          <option key={label.id} value={label.id}>
            {label.name}
          </option>
        ))}
      </Select>
    </div>
  );
}

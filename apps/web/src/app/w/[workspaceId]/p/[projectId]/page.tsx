'use client';

import { useParams } from 'next/navigation';
import { BoardView } from '../../../../../components/board/BoardView';

export default function BoardPage() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId: string }>();
  return <BoardView workspaceId={workspaceId} projectId={projectId} />;
}

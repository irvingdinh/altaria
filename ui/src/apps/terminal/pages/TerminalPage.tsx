import { useParams } from 'react-router-dom';
import { SessionList } from '../components/SessionList';
import { TerminalView } from '../components/TerminalView';

export function TerminalPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="layout">
      <aside className="sidebar">
        <SessionList activeId={id} />
      </aside>
      <main className="main-area">
        <TerminalView sessionId={id} />
      </main>
    </div>
  );
}

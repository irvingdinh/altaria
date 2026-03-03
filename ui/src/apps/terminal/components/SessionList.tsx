import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSession, deleteSession, listSessions, type SessionInfo } from '../../../lib/api';

export function SessionList({ activeId }: { activeId?: string }) {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const navigate = useNavigate();

  const refresh = () => {
    listSessions().then(setSessions);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreate = async () => {
    const session = await createSession();
    refresh();
    navigate(`/terminals/${session.id}`);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteSession(id);
    refresh();
    if (id === activeId) navigate('/');
  };

  return (
    <div className="session-list">
      <button className="new-session-btn" onClick={handleCreate}>
        + New
      </button>
      <ul>
        {sessions.map((s) => (
          <li
            key={s.id}
            className={s.id === activeId ? 'active' : ''}
            onClick={() => navigate(`/terminals/${s.id}`)}
          >
            <span className="session-id">{s.id.slice(0, 8)}</span>
            <button
              className="delete-btn"
              onClick={(e) => handleDelete(s.id, e)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

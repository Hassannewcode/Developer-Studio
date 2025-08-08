/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import c from 'clsx';
import useStore from '../lib/store.js';
import { loadHistorySession, deleteHistorySession } from '../lib/actions.js';

const timeAgo = (timestamp) => {
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "Just now";
};

const HistoryItem = ({ session }) => {
    const { id, type, timestamp, preview } = session;

    const handleLoad = (e) => {
        e.stopPropagation();
        loadHistorySession(id);
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this session?')) {
            deleteHistorySession(id);
        }
    };

    return (
        <li className="history-item" onClick={handleLoad} title="Load this session">
            <div className="history-item-header">
                <div className="history-item-info">
                    <span className={c('chip', type)}>
                       <span className="icon">{type === 'chat' ? 'chat_bubble' : 'science'}</span> {type}
                    </span>
                </div>
                <div className="history-item-actions">
                    <button className="iconButton" onClick={handleDelete} title="Delete session">
                        <span className="icon">delete</span>
                    </button>
                </div>
            </div>
            <p className="history-item-preview">{preview}</p>
            <span className="history-item-timestamp">{timeAgo(timestamp)}</span>
        </li>
    );
};

export default function HistoryPanel({ isOpen, onClose }) {
  const history = useStore(state => state.history);

  if (!isOpen) return null;

  return (
    <aside className="history-panel">
      <div className="history-panel-header">
        <h3>
          <span className="icon">history</span> Session History
        </h3>
        <button className="iconButton" onClick={onClose} title="Close History">
          <span className="icon">close</span>
        </button>
      </div>
      <div className="history-panel-body">
        {history.length > 0 ? (
          <ul className="history-list">
            {history.map(session => (
              <HistoryItem key={session.id} session={session} />
            ))}
          </ul>
        ) : (
          <p className="empty-list-message">Your past sessions will appear here.</p>
        )}
      </div>
    </aside>
  );
}
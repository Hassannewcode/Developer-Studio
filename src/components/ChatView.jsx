/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useRef } from 'react';
import useStore from '../lib/store.js';
import ChatMessage from './ChatMessage.jsx';

export default function ChatView() {
  const chatHistory = useStore(state => state.chatHistory);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  return (
    <div className="chat-view">
      {chatHistory.length === 0 ? (
        <div className="intro">
            <h2>Chat Mode</h2>
            <p>Start a conversation with the multi-agent system. Your requests will be handled by an Assistant and reviewed by a Critic for higher quality results.</p>
        </div>
      ) : (
        chatHistory.map(message => (
          <ChatMessage key={message.id} message={message} />
        ))
      )}
      <div ref={chatEndRef} />
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import c from 'clsx';
import { memo } from 'react';
import useStore from '../lib/store.js';
import ModelOutput from './ModelOutput.jsx';
import { allModes } from '../lib/modes.js';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const ThinkingBubble = () => (
    <div className="thinking-bubble">
        <div className="thinking-dot"></div>
        <div className="thinking-dot"></div>
        <div className="thinking-dot"></div>
    </div>
);

const PipelineFeedback = ({ fixerNotes, review }) => {
    if (!fixerNotes && !review) return null;

    return (
    <div className="pipeline-feedback">
        {fixerNotes && (
            <details className="feedback-section">
                <summary>
                    <span className="icon">build</span>
                    Agent Notes
                </summary>
                <p>{fixerNotes}</p>
            </details>
        )}
        {review && review !== 'N/A' && (
            <details className="feedback-section">
                <summary>
                    <span className="icon">rate_review</span>
                    Agent Review
                </summary>
                <div className="critique-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(review)) }}></div>
            </details>
        )}
    </div>
)};


const ChatResponseVariant = ({ response }) => {
    const { model: globalModel } = useStore();
    const { finalCode, hasError, fixerNotes, review, groundingMetadata, profile } = response;
    
    const currentMode = allModes[profile.id] || { syntax: 'text' };
    const modelKey = currentMode.model || globalModel;
    const isRenderable = currentMode.isRenderable;

    // For non-renderable modes, we want to show the full markdown/text.
    // For renderable modes, we want to extract the code from the fences.
    let outputData = finalCode;
    if (isRenderable) {
        const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/s;
        const match = finalCode.match(codeBlockRegex);
        if (match) {
            outputData = match[1].trim();
        }
    }
    
    return (
        <div className="chat-bubble-multi-part">
            <div className={c("response-part-content", { "has-error": hasError })}>
                <div className={c("chat-model-output", { "non-renderable": !isRenderable })}>
                    <ModelOutput
                        outputData={outputData}
                        outputMode={profile.id}
                        modelKey={modelKey}
                        isBusy={false}
                        gotError={hasError}
                        groundingMetadata={groundingMetadata}
                    />
                </div>
            </div>
            {(fixerNotes || review) && <PipelineFeedback fixerNotes={fixerNotes} review={review} />}
        </div>
    );
};

const ModelResponse = ({ content }) => {
    if (content.isThinking && content.responses.length === 0) {
        return <ThinkingBubble />;
    }

    const sortedResponses = [...content.responses].sort((a, b) => (a.variant || '').localeCompare(b.variant || ''));

    if (sortedResponses.length > 1) { // A/B Test
        return (
            <div className="ab-test-outputs chat-ab-test-outputs">
                {sortedResponses.map(response => (
                    <div key={response.variant} className="ab-test-column chat-ab-test-column">
                        <div className="ab-test-header chip">
                            <span className="icon">{response.profile.icon}</span> 
                            Variant {response.variant}: {response.profile.name}
                        </div>
                        <ChatResponseVariant response={response} />
                    </div>
                ))}
            </div>
        );
    }
    
    if (sortedResponses.length === 1) { // Single response
        return <ChatResponseVariant response={sortedResponses[0]} />;
    }

    return <ThinkingBubble />; // Fallback while waiting for first response
};


function ChatMessage({ message }) {
  const { role, content } = message;

  return (
    <div className={c('chat-message-container', role)}>
        <div className="chat-avatar">
            <span className="icon">{role === 'user' ? 'person' : 'auto_awesome'}</span>
        </div>
        <div className="chat-bubble">
            {role === 'user' ? (
                <p>{content}</p>
            ) : (
                <ModelResponse content={content} />
            )}
        </div>
    </div>
  );
}

export default memo(ChatMessage);

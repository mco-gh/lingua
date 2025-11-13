import React, { useRef, useEffect } from 'react';
import type { TranscriptEntry } from '../types';

interface ConversationDisplayProps {
  transcript: TranscriptEntry[];
}

const ConversationDisplay: React.FC<ConversationDisplayProps> = ({ transcript }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  return (
    <div className="flex-1 w-full p-4 md:p-6 overflow-y-auto bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
      <div className="space-y-4">
        {transcript.map((entry) => (
          <div
            key={entry.id}
            className={`flex items-end gap-2 ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {entry.speaker === 'ai' && (
               <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">AI</div>
            )}
            <div
              className={`max-w-md p-3 rounded-xl transition-colors ${
                entry.speaker === 'user'
                  ? 'bg-blue-600 rounded-br-none text-white'
                  : 'bg-gray-200 dark:bg-gray-700 rounded-bl-none text-gray-900 dark:text-white'
              }`}
            >
              <p>{entry.text}</p>
            </div>
             {entry.speaker === 'user' && (
               <div className="w-8 h-8 rounded-full bg-gray-500 dark:bg-gray-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">You</div>
            )}
          </div>
        ))}
        <div ref={endOfMessagesRef} />
      </div>
       {transcript.length === 0 && (
         <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 dark:text-gray-400">Your conversation will appear here.</p>
         </div>
       )}
    </div>
  );
};

export default ConversationDisplay;
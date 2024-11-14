import type React from 'react';

interface HeaderProps {
  apiKey: string;
  exportConversationAsCSV: () => void;
  isLocalServer: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  apiKey,
  exportConversationAsCSV,
  isLocalServer,
}) => (
  <div className="content-top">
    <div className="content-title">
      <img src="/openai-logomark.svg" alt="OpenAI Logo" />
      <span>リアルタイム自動車営業ロープレ</span>
    </div>
    <button 
      onClick={exportConversationAsCSV}
      className="export-button"
      style={{
        margin: '1rem',
        padding: '0.5rem 1rem',
        backgroundColor: '#000000',
        color: 'white',
        border: 'none',
        borderRadius: '0.5rem',
        cursor: 'pointer'
      }}
      type="button"
    >
      ログCSV出力
    </button>
  </div>
);

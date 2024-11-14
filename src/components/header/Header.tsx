import type React from 'react';
import { Button } from '../button/Button';
import { Edit } from 'react-feather';

interface HeaderProps {
  apiKey: string;
  resetAPIKey: () => void;
  isLocalServer: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  apiKey,
  resetAPIKey,
  isLocalServer,
}) => (
  <div className="content-top">
    <div className="content-title">
      <img src="/openai-logomark.svg" alt="OpenAI Logo" />
      <span>リアルタイム自動車営業ロープレ</span>
    </div>
    <div className="content-api-key">
      {!isLocalServer && (
        <Button
          icon={Edit}
          iconPosition="end"
          buttonStyle="flush"
          label={`APIキー: ${apiKey.slice(0, 3)}...`}
          onClick={resetAPIKey}
        />
      )}
    </div>
  </div>
);

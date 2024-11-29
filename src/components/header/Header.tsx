import type React from 'react';
import { Button } from '../button/Button';
import './Header.scss';
interface HeaderProps {
  apiKey: string;
  exportConversationAsCSV: () => void;
  isLocalServer: boolean;
  setIsInstructionModalOpen: (value: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  apiKey,
  exportConversationAsCSV,
  isLocalServer,
  setIsInstructionModalOpen,
}) => (
  <div className="content-top">
    <div className="content-title">
      <img src="/openai-logomark.svg" alt="OpenAI Logo" />
      <span>リアルタイム自動車営業ロープレ</span>
    </div>
    <div className="instruction-button">
      <Button
        label="Instruction"
        buttonStyle="regular"
        onClick={() => setIsInstructionModalOpen(true)}
      />
    </div>

    <div className="export-button">
      <Button
        label="ログCSV出力"
        buttonStyle="regular"
        onClick={exportConversationAsCSV}
      />
    </div>
  </div>
);

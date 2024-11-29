import type React from 'react';
import { Button } from '../button/Button';
import { Toggle } from '../toggle/Toggle';
import { X, Zap } from 'react-feather';
import './Actions.scss';

interface ActionsProps {
  isConnected: boolean;
  canPushToTalk: boolean;
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  changeTurnEndType: (value: string) => void;
  connectConversation: () => void;
  disconnectConversation: () => void;
  setIsInstructionModalOpen: (value: boolean) => void;
}

export const Actions: React.FC<ActionsProps> = ({
  isConnected,
  canPushToTalk,
  isRecording,
  startRecording,
  stopRecording,
  changeTurnEndType,
  connectConversation,
  disconnectConversation,
  setIsInstructionModalOpen,
}) => (
  <div className="content-actions">
    <div className="manual-button">
      <Toggle
        defaultValue={false}
        labels={['手動', 'VAD']}
        values={['none', 'server_vad']}
        onChange={(_, value) => changeTurnEndType(value)}
      />
    </div>

    <div className="conversation-button">
      {isConnected && canPushToTalk && (
        <Button
          label={isRecording ? '送信(release)' : '会話(push)'}
          buttonStyle={isRecording ? 'alert' : 'regular'}
          disabled={!isConnected || !canPushToTalk}
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
        />
      )}
    </div>

    <div className="vad-button">
      <Button
        label={isConnected ? '切断' : '接続'}
        iconPosition={isConnected ? 'end' : 'start'}
        icon={isConnected ? X : Zap}
        buttonStyle={isConnected ? 'regular' : 'action'}
        onClick={isConnected ? disconnectConversation : connectConversation}
      />
    </div>
  </div>
);

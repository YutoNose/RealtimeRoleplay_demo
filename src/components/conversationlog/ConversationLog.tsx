// ConversationLog.tsx
import { X } from 'react-feather';
import './ConversationLog.scss';

interface WavFile {
  url: string;
}

interface FormattedToolType {
  name: string;
  arguments: string;
}

interface FormattedItem {
  audio?: Int16Array;
  transcript?: string;
  text?: string;
  output?: string;
  tool?: FormattedToolType;
  file?: WavFile;
}

interface ConversationItem {
  id: string;
  role?: 'user' | 'assistant' | 'system';
  type: string;
  formatted: FormattedItem;
  status?: 'completed' | 'pending' | 'failed';
}

interface ConversationLogProps {
  items: ConversationItem[];
  deleteConversationItem: (id: string) => void;
}

export const ConversationLog: React.FC<ConversationLogProps> = ({
  items,
  deleteConversationItem,
}) => (
  <div className="conversation-block">
    <div className="conversation-title">営業ロールプレイング</div>
    <div className="conversation-body" data-conversation-content>
      {!items.length && '接続待ち...'}
      {items.map((conversationItem) => (
        <div className="conversation-item" key={conversationItem.id}>
          <div className={`speaker ${conversationItem.role || ''}`}>
            <div className="role">
              {conversationItem.role === 'user'
                ? '営業'
                : conversationItem.role === 'assistant'
                ? '顧客'
                : 'システム'}
            </div>
            <button
              className="close"
              onClick={() => deleteConversationItem(conversationItem.id)}
              type="button"
            >
              <X />
            </button>
          </div>
          <div className="speaker-content">
            {/* ツールレスポンス */}
            {conversationItem.type === 'function_call_output' && (
              <div>{conversationItem.formatted.output}</div>
            )}
            {/* ツール呼び出し */}
            {!!conversationItem.formatted.tool && (
              <div>
                {conversationItem.formatted.tool.name}(
                {conversationItem.formatted.tool.arguments})
              </div>
            )}
            {/* 顧客の発言 */}
            {conversationItem.role === 'user' && (
              <div>
                {conversationItem.formatted.transcript ||
                  conversationItem.formatted.text ||
                  '(書き出し中)'}
              </div>
            )}
            {/* 営業の発言 */}
            {conversationItem.role === 'assistant' && (
              <div>
                {conversationItem.formatted.transcript ||
                  conversationItem.formatted.text ||
                  '(書き出し中)'}
              </div>
            )}
            {/* 音声ファイル */}
            {conversationItem.formatted.file && (
              <audio
                src={conversationItem.formatted.file.url}
                controls
                autoPlay
                muted
              />
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

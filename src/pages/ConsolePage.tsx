import { useEffect, useRef, useCallback, useState } from 'react';
import { RealtimeClient } from '@openai/realtime-api-beta';
import type {
  ItemType,
  FormattedItemType,
  FormattedToolType,
} from '@openai/realtime-api-beta/dist/lib/client.js';
import { WavRecorder, WavStreamPlayer } from '../lib/wavtools/index.js';
import { WavRenderer } from '../utils/wav_renderer';
import { supabase } from '../lib/supabase/supabaseclient'; // supabaseclientをインポート

import { Header } from '../components/header/Header';
import { EventsLog } from '../components/eventslog/EventsLog';
import { ConversationLog } from '../components/conversationlog/ConversationLog';
import { Actions } from '../components/action/Action';
import { InstructionModal } from '../components/instructionmodal/InstructionModal'; // InstructionModalをインポート

import './ConsolePage.scss';

/**
 * ローカルリレーサーバーを実行すると、APIキーを隠して
 * サーバー上でカスタムロジックを実行できます
 *
 * ローカルリレーサーバーのアドレスを設定:
 * REACT_APP_LOCAL_RELAY_SERVER_URL=http://localhost:8081
 *
 * また、`.env`ファイルにOPENAI_API_KEY=を設定する必要があります
 * `npm start`と並行して`npm run relay`で実行できます
 */
const LOCAL_RELAY_SERVER_URL: string =
  process.env.REACT_APP_LOCAL_RELAY_SERVER_URL || '';

/**
 * OpenAI APIキーを環境変数から取得
 */
const OPENAI_API_KEY: string = process.env.REACT_APP_OPENAI_API_KEY || '';

/**
 * タイプ定義
 */
interface RealtimeEvent {
  time: string;
  source: 'client' | 'server';
  count?: number;
  event: {
    type: string;
    event_id: string;
    audio?: Uint8Array;
    delta?: Uint8Array;
    [key: string]: unknown;
  };
}

interface ConversationUpdateEvent {
  item: ItemType & { status?: 'completed' | 'pending' | 'failed' };
  delta: {
    audio?: Uint8Array;
  };
}

interface ToolParameters {
  key: string;
  value: string;
}

interface WavFile {
  url: string;
}

interface FormattedItem {
  audio?: Int16Array;
  transcript?: string;
  text?: string;
  output?: string;
  tool?: FormattedToolType;
  file?: WavFile;
}

interface ConversationItem extends Omit<FormattedItemType, 'audio' | 'tool'> {
  role?: 'user' | 'assistant' | 'system';
  type: 'function_call_output' | string;
  formatted: FormattedItem;
  id: string;
  status?: 'completed' | 'pending' | 'failed';
}

export async function getInstructions() {
  const { data: userSession, error: userError } = await supabase.auth.getUser();

  if (userError || !userSession) {
    console.error('User not logged in:', userError?.message);
    throw new Error('User not logged in');
  }

  const userId = userSession.user.id; // ログイン中のユーザーのID
  console.log('Logged-in user ID:', userId);

  const { data, error } = await supabase
    .from('instructions')
    .select('instruction')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching instructions:', error.message);
    throw error;
  }

  if (!data || data.length === 0) {
    console.warn('No instructions found for the user.');
    return null;
  }

  console.log('Fetched instructions:', data);
  return data[0].instruction;
}


export function ConsolePage() {
  /**
   * APIキーの設定
   */
  const apiKey = LOCAL_RELAY_SERVER_URL ? '' : OPENAI_API_KEY;

  /**
   * インスタンス化
   */
  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 })
  );
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );
  const clientRef = useRef<RealtimeClient>(
    new RealtimeClient(
      LOCAL_RELAY_SERVER_URL
        ? { url: LOCAL_RELAY_SERVER_URL }
        : {
            apiKey: apiKey,
            dangerouslyAllowAPIKeyInBrowser: true,
          }
    )
  );

  /**
   * 参照
   */
  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const serverCanvasRef = useRef<HTMLCanvasElement>(null);
  const eventsScrollHeightRef = useRef(0);
  const eventsScrollRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<string>(new Date().toISOString());

  /**
   * 状態変数
   */
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<{
    [key: string]: boolean;
  }>({});
  const [isConnected, setIsConnected] = useState(false);
  const [canPushToTalk, setCanPushToTalk] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [memoryKv, setMemoryKv] = useState<{ [key: string]: string }>({});
  const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false); // InstructionModalの状態変数を追加
  const [instruction, setInstruction] = useState<string | null>(null); // Instructionの状態変数を追加

  /**
   * ログのタイミングをフォーマットするユーティリティ
   */
  const formatTime = useCallback((timestamp: string) => {
    const startTime = startTimeRef.current;
    const t0 = new Date(startTime).valueOf();
    const t1 = new Date(timestamp).valueOf();
    const delta = t1 - t0;
    const hs = Math.floor(delta / 10) % 100;
    const s = Math.floor(delta / 1000) % 60;
    const m = Math.floor(delta / 60_000) % 60;
    const pad = (n: number) => {
      let s = `${n}`;
      while (s.length < 2) {
        s = `0${s}`;
      }
      return s;
    };
    return `${pad(m)}:${pad(s)}.${pad(hs)}`;
  }, []);
/**
   * 会話ログをCSVとしてエクスポート
   */
const exportConversationAsCSV = useCallback(() => {
  // CSVヘッダー
  const headers = ['時刻','話者', 'メッセージ'];
  const csvRows = [headers];

  // 会話ログをCSV行に変換
  for (const item of items) {
    const timestamp = new Date().toLocaleString();
    const role = item.role === 'user' ? 'あなた' : 
                 item.role === 'assistant' ? '顧客' : 
                 'システム';
    const message = item.formatted.text || item.formatted.transcript || '';
    csvRows.push([timestamp, role, message]);
  };

  // CSV文字列を作成
  const csvContent = csvRows.map(row => row.join(',')).join('\n');
  
  // BOMを付与してUTF-8でエンコード
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8' });
  
  // ダウンロードリンクを作成
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `conversation_${new Date().toISOString()}.csv`;
  
  // ダウンロードを実行
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [items]);

  /**
   * 会話に接続
   */
  const connectConversation = useCallback(async () => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    // 状態変数の設定
    startTimeRef.current = new Date().toISOString();
    setIsConnected(true);
    setRealtimeEvents([]);
    setItems(client.conversation.getItems() as ConversationItem[]);

    // マイクに接続
    await wavRecorder.begin();

    // 音声出力に接続
    await wavStreamPlayer.connect();

    // リアルタイムAPIに接続
    await client.connect();
    client.sendUserMessageContent([
      {
        type: 'input_text',
        text: 'こんにちは！',
      },
    ]);

    if (client.getTurnDetectionType() === 'server_vad') {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }
  }, []);

  /**
   * 切断して会話状態をリセット
   */
  const disconnectConversation = useCallback(async () => {
    setIsConnected(false);
    setRealtimeEvents([]);
    setItems([]);
    setMemoryKv({});

    const client = clientRef.current;
    client.disconnect();

    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.end();

    const wavStreamPlayer = wavStreamPlayerRef.current;
    await wavStreamPlayer.interrupt();
  }, []);

  const deleteConversationItem = useCallback(async (id: string) => {
    const client = clientRef.current;
    client.deleteItem(id);
  }, []);

  /**
   * プッシュトゥトークモードで録音開始
   */
  const startRecording = async () => {
    setIsRecording(true);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const trackSampleOffset = await wavStreamPlayer.interrupt();
    if (trackSampleOffset?.trackId) {
      const { trackId, offset } = trackSampleOffset;
      await client.cancelResponse(trackId, offset);
    }
    await wavRecorder.record((data) => client.appendInputAudio(data.mono));
  };

  /**
   * プッシュトゥトークモードで録音停止
   */
  const stopRecording = async () => {
    setIsRecording(false);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.pause();
    client.createResponse();
  };

  /**
   * マニュアル <> VADモード間の通信切り替え
   */
  const changeTurnEndType = async (value: string) => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    if (value === 'none' && wavRecorder.getStatus() === 'recording') {
      await wavRecorder.pause();
    }
    client.updateSession({
      turn_detection: value === 'none' ? null : { type: 'server_vad' },
    });
    if (value === 'server_vad' && client.isConnected()) {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }
    setCanPushToTalk(value === 'none');
  };

  /**
   * イベントログの自動スクロール
   */
  /* biome-ignore lint/correctness/useExhaustiveDependencies: イベントログの自動スクロールのために必要な依存関係を指定します */
  useEffect(() => {
    if (eventsScrollRef.current) {
      const eventsEl = eventsScrollRef.current;
      const scrollHeight = eventsEl.scrollHeight;
      if (scrollHeight !== eventsScrollHeightRef.current) {
        eventsEl.scrollTop = scrollHeight;
        eventsScrollHeightRef.current = scrollHeight;
      }
    }
  }, [realtimeEvents]);

  /**
   * 会話ログの自動スクロール
   */
    /* biome-ignore lint/correctness/useExhaustiveDependencies: 会話ログの自動スクロールのために必要な依存関係を指定します */
  useEffect(() => {
    const conversationEls = Array.from(
      document.body.querySelectorAll<HTMLDivElement>(
        '[data-conversation-content]'
      )
    );
    for (const el of conversationEls) {
      el.scrollTop = el.scrollHeight;
    }
  }, [items]);

  /**
   * 可視化キャンバスのレンダリングループを設定
   */
  useEffect(() => {
    let isLoaded = true;

    const wavRecorder = wavRecorderRef.current;
    const clientCanvas = clientCanvasRef.current;
    let clientCtx: CanvasRenderingContext2D | null = null;

    const wavStreamPlayer = wavStreamPlayerRef.current;
    const serverCanvas = serverCanvasRef.current;
    let serverCtx: CanvasRenderingContext2D | null = null;

    const render = () => {
      if (isLoaded) {
        if (clientCanvas) {
          if (!clientCanvas.width || !clientCanvas.height) {
            clientCanvas.width = clientCanvas.offsetWidth;
            clientCanvas.height = clientCanvas.offsetHeight;
          }
          clientCtx = clientCtx || clientCanvas.getContext('2d');
          if (clientCtx) {
            clientCtx.clearRect(0, 0, clientCanvas.width, clientCanvas.height);
            const result = wavRecorder.recording
              ? wavRecorder.getFrequencies('voice')
              : { values: new Float32Array([0]) };
            WavRenderer.drawBars(
              clientCanvas,
              clientCtx,
              result.values,
              '#0099ff',
              10,
              0,
              8
            );
          }
        }
        if (serverCanvas) {
          if (!serverCanvas.width || !serverCanvas.height) {
            serverCanvas.width = serverCanvas.offsetWidth;
            serverCanvas.height = serverCanvas.offsetHeight;
          }
          serverCtx = serverCtx || serverCanvas.getContext('2d');
          if (serverCtx) {
            serverCtx.clearRect(0, 0, serverCanvas.width, serverCanvas.height);
            const result = wavStreamPlayer.analyser
              ? wavStreamPlayer.getFrequencies('voice')
              : { values: new Float32Array([0]) };
            WavRenderer.drawBars(
              serverCanvas,
              serverCtx,
              result.values,
              '#009900',
              10,
              0,
              8
            );
          }
        }
        window.requestAnimationFrame(render);
      }
    };
    render();

    return () => {
      isLoaded = false;
    };
  }, []);

  /**
   * RealtimeClientとオーディオキャプチャの基本設定
   */
  useEffect(() => {
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const client = clientRef.current;

    getInstructions().then((instructions) => {
      client.updateSession({ instructions: instructions });
      setInstruction(instructions); // Instructionの状態を設定
    });
    client.updateSession({ input_audio_transcription: { model: 'whisper-1' } });

    client.addTool(
      {
        name: 'set_memory',
        description: 'ユーザーに関する重要なデータをメモリに保存します。',
        parameters: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description:
                'メモリ値のキー。常に小文字とアンダースコアを使用し、他の文字は使用しない。',
            },
            value: {
              type: 'string',
              description: '値は文字列として表現できるものなら何でも可',
            },
          },
          required: ['key', 'value'],
        },
      },
      async ({ key, value }: ToolParameters) => {
        setMemoryKv((memoryKv) => {
          const newKv = { ...memoryKv };
          newKv[key] = value;
          return newKv;
        });
        return { ok: true };
      }
    );

    client.on('realtime.event', (realtimeEvent: RealtimeEvent) => {
      setRealtimeEvents((realtimeEvents) => {
        const lastEvent = realtimeEvents[realtimeEvents.length - 1];
        if (lastEvent?.event.type === realtimeEvent.event.type) {
          const updatedLastEvent = { ...lastEvent };
          updatedLastEvent.count = (updatedLastEvent.count || 0) + 1;
          return realtimeEvents.slice(0, -1).concat(updatedLastEvent);
        }
        return realtimeEvents.concat(realtimeEvent);
      });
    });
    client.on('error', (error: Error) => console.error(error));
    client.on('conversation.interrupted', async () => {
      const trackSampleOffset = await wavStreamPlayer.interrupt();
      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;
        await client.cancelResponse(trackId, offset);
      }
    });
    client.on(
      'conversation.updated',
      async ({ item, delta }: ConversationUpdateEvent) => {
        const items = client.conversation.getItems() as ConversationItem[];
        if (delta?.audio) {
          wavStreamPlayer.add16BitPCM(delta.audio, item.id);
        }
        if (item.status === 'completed' && item.formatted.audio?.length) {
          const wavFile = await WavRecorder.decode(
            item.formatted.audio,
            24000,
            24000
          );
          item.formatted.file = wavFile;
        }
        setItems(items);
      }
    );

    setItems(client.conversation.getItems() as ConversationItem[]);

    return () => {
      client.reset();
    };
  }, []);

  // ユーザーの認証状態を確認
  useEffect(() => {
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        // ログインしていない場合はリダイレクト
        window.location.href = '/login';
      }
    };
    checkUser();
  }, []);

  return (
    <div data-component="ConsolePage">
      <Header
        apiKey={apiKey}
        exportConversationAsCSV={exportConversationAsCSV}
        isLocalServer={!!LOCAL_RELAY_SERVER_URL}
        setIsInstructionModalOpen={setIsInstructionModalOpen}
      />
      <div className="content-main">
        <div className="left-half">
          {/* 左側半分：ログを表示 */}
          <ConversationLog
            items={items}
            deleteConversationItem={deleteConversationItem}
          />
        </div>
        <div className="right-half">
          <div className="top-half">
            {/* 右側上半分：人の顔を表示 */}
            <div className="human-face">
              {/* ここに人の顔の画像を表示します */}
              <img src="/sampleman.png" alt="Human Face" />
            </div>
          </div>
          <div className="bottom-half">
            {/* 右側下半分：イベントログを表示 */}
            <EventsLog
              clientCanvasRef={clientCanvasRef}
              serverCanvasRef={serverCanvasRef}
              realtimeEvents={realtimeEvents}
              expandedEvents={expandedEvents}
              setExpandedEvents={setExpandedEvents}
              formatTime={formatTime}
              eventsScrollRef={eventsScrollRef}
            />
          </div>
        </div>
      </div>
      <Actions
        isConnected={isConnected}
        canPushToTalk={canPushToTalk}
        isRecording={isRecording}
        startRecording={startRecording}
        stopRecording={stopRecording}
        changeTurnEndType={changeTurnEndType}
        connectConversation={connectConversation}
        disconnectConversation={disconnectConversation}
        setIsInstructionModalOpen={setIsInstructionModalOpen}
      />
      <InstructionModal
        isOpen={isInstructionModalOpen}
        onClose={() => setIsInstructionModalOpen(false)}
        instruction={instruction}
      />
    </div>
  );
}

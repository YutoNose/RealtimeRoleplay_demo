import type React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { ArrowUp, ArrowDown } from 'react-feather';

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

interface EventsLogProps {
  clientCanvasRef: React.RefObject<HTMLCanvasElement>;
  serverCanvasRef: React.RefObject<HTMLCanvasElement>;
  realtimeEvents: RealtimeEvent[];
  expandedEvents: { [key: string]: boolean };
  setExpandedEvents: Dispatch<SetStateAction<{ [key: string]: boolean }>>;
  formatTime: (timestamp: string) => string;
  eventsScrollRef: React.RefObject<HTMLDivElement>;
}

export const EventsLog: React.FC<EventsLogProps> = ({
  clientCanvasRef,
  serverCanvasRef,
  realtimeEvents,
  expandedEvents,
  setExpandedEvents,
  formatTime,
  eventsScrollRef,
}) => (
  <div className="content-block events">
    <div className="visualization">
      <div className="visualization-entry client">
        <canvas ref={clientCanvasRef} />
      </div>
      <div className="visualization-entry server">
        <canvas ref={serverCanvasRef} />
      </div>
    </div>
    <div className="content-block-title">イベント</div>
    <div className="content-block-body" ref={eventsScrollRef}>
      {!realtimeEvents.length && '接続待ち...'}
      {realtimeEvents.map((realtimeEvent) => {
        const count = realtimeEvent.count;
        const event = { ...realtimeEvent.event };
        if (event.type === 'input_audio_buffer.append') {
          event.audio = new Uint8Array(0);
        } else if (event.type === 'response.audio.delta') {
          event.delta = new Uint8Array(0);
        }
        return (
          <div className="event" key={event.event_id}>
            <div className="event-timestamp">{formatTime(realtimeEvent.time)}</div>
            <div className="event-details">
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
              <div
                className="event-summary"
                onClick={() => {
                  const id = event.event_id;
                  setExpandedEvents((prev) => ({
                    ...prev,
                    [id]: !prev[id],
                  }));
                }}
              >
                <div
                  className={`event-source ${
                    event.type === 'error' ? 'error' : realtimeEvent.source
                  }`}
                >
                  {realtimeEvent.source === 'client' ? <ArrowUp /> : <ArrowDown />}
                  <span>
                    {event.type === 'error' ? 'エラー!' : realtimeEvent.source}
                  </span>
                </div>
                <div className="event-type">
                  {event.type}
                  {count && ` (${count})`}
                </div>
              </div>
              {!!expandedEvents[event.event_id] && (
                <div className="event-payload">
                  {JSON.stringify(event, null, 2)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

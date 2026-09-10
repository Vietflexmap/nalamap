"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Layers3,
  LoaderCircle,
  Send,
  Settings2,
  Sparkles,
  Square,
} from "lucide-react";
import { useNaLaMapAgent } from "../../hooks/useNaLaMapAgent";
import { useChatInterfaceStore } from "../../stores/chatInterfaceStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { getApiBase } from "../../utils/apiBase";
import styles from "./workbench.module.css";

type WorkbenchAssistantProps = {
  pendingPrompt?: string | null;
  onPendingPromptConsumed?: () => void;
};

const EXAMPLES = [
  "Tóm tắt các lớp hiện có và đề xuất phép phân tích phù hợp.",
  "Tạo vùng đệm 1 km quanh lớp đang chọn, giữ thuộc tính và thêm kết quả.",
  "Tính tâm của các polygon trong lớp đang chọn rồi hiển thị lên bản đồ.",
];

function friendlyProvider(provider: string): string {
  if (provider === "glm") return "GLM";
  if (provider === "deepseek") return "DeepSeek";
  if (!provider) return "Backend default";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export default function WorkbenchAssistant({
  pendingPrompt,
  onPendingPromptConsumed,
}: WorkbenchAssistantProps) {
  const { queryNaLaMapAgentStream, cancelRequest } = useNaLaMapAgent(getApiBase());
  const [draft, setDraft] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const lastPendingPrompt = useRef<string | null>(null);

  const messages = useChatInterfaceStore((state) => state.messages);
  const toolUpdates = useChatInterfaceStore((state) => state.toolUpdates);
  const streamingMessage = useChatInterfaceStore((state) => state.streamingMessage);
  const isStreaming = useChatInterfaceStore((state) => state.isStreaming);
  const loading = useChatInterfaceStore((state) => state.loading);
  const error = useChatInterfaceStore((state) => state.error);
  const executionPlan = useChatInterfaceStore((state) => state.executionPlan);

  const initialized = useSettingsStore((state) => state.initialized);
  const initializeIfNeeded = useSettingsStore((state) => state.initializeIfNeeded);
  const modelSettings = useSettingsStore((state) => state.model_settings);
  const modelOptions = useSettingsStore((state) => state.model_options);
  const setModelProvider = useSettingsStore((state) => state.setModelProvider);
  const setModelName = useSettingsStore((state) => state.setModelName);
  const setMaxTokens = useSettingsStore((state) => state.setMaxTokens);

  const providerNames = useMemo(() => Object.keys(modelOptions), [modelOptions]);
  const modelsForProvider = modelOptions[modelSettings.model_provider] || [];
  const modelNames = modelsForProvider.map((model) => model.name);

  useEffect(() => {
    if (!initialized) void initializeIfNeeded();
  }, [initialized, initializeIfNeeded]);

  const runQuery = useCallback(
    async (value: string) => {
      const query = value.trim();
      if (!query || isStreaming) return;
      setDraft("");
      await queryNaLaMapAgentStream("chat", undefined, query);
    },
    [isStreaming, queryNaLaMapAgentStream],
  );

  useEffect(() => {
    if (!pendingPrompt) {
      lastPendingPrompt.current = null;
      return;
    }
    if (isStreaming || lastPendingPrompt.current === pendingPrompt) return;
    lastPendingPrompt.current = pendingPrompt;
    onPendingPromptConsumed?.();
    void runQuery(pendingPrompt);
  }, [isStreaming, onPendingPromptConsumed, pendingPrompt, runQuery]);

  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTo({ top: body.scrollHeight, behavior: "smooth" });
  }, [messages, toolUpdates, streamingMessage, executionPlan]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runQuery(draft);
  };

  const handleProviderChange = (provider: string) => {
    setModelProvider(provider);
    const models = modelOptions[provider] || [];
    if (models[0]) {
      setModelName(models[0].name);
      setMaxTokens(models[0].max_tokens);
    }
  };

  const isBusy = loading || isStreaming;

  return (
    <aside className={styles.assistant} aria-label="NaLaMap AI assistant" data-testid="workbench-assistant">
      <header className={styles.assistantHeader}>
        <div className={styles.assistantIdentity}>
          <span className={styles.assistantAvatar}><Sparkles size={16} /></span>
          <span className={styles.assistantModel}>
            <span className={styles.assistantTitle}>NaLaMap AI Agent</span>
            <span className={styles.assistantStatus}>{isBusy ? "Đang xử lý workspace" : "Sẵn sàng nhận lệnh GIS"}</span>
          </span>
        </div>
        <div className={styles.assistantControls}>
          {providerNames.length > 0 ? (
            <>
              <select
                className={styles.assistantSelect}
                value={modelSettings.model_provider}
                onChange={(event) => handleProviderChange(event.target.value)}
                aria-label="AI provider"
                data-testid="workbench-provider-select"
              >
                {providerNames.map((provider) => (
                  <option key={provider} value={provider}>{friendlyProvider(provider)}</option>
                ))}
              </select>
              <select
                className={styles.assistantSelect}
                value={modelSettings.model_name}
                onChange={(event) => setModelName(event.target.value)}
                aria-label="AI model"
                data-testid="workbench-model-select"
              >
                {modelNames.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </>
          ) : (
            <span className={styles.assistantStatus}><Settings2 size={12} /> Auto</span>
          )}
        </div>
      </header>

      <div className={styles.assistantBody} ref={bodyRef}>
        {messages.length === 0 && !streamingMessage && toolUpdates.length === 0 ? (
          <div className={styles.assistantEmpty}>
            <Bot size={25} />
            <strong>Điều khiển bản đồ bằng ngôn ngữ tự nhiên</strong>
            <p>Agent có thể tìm dữ liệu, gọi geoprocessing, kiểm tra CRS và giải thích từng bước.</p>
            <div className={styles.assistantExamples}>
              {EXAMPLES.map((example) => (
                <button key={example} type="button" className={styles.assistantExample} onClick={() => void runQuery(example)}>
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.assistantMessages}>
            {messages.map((message, index) => {
              if (message.type === "system" || message.type === "tool" || message.type === "function") return null;
              const human = message.type === "human";
              return (
                <div key={`${message.id || message.type}-${index}`} className={`${styles.message} ${human ? styles.messageHuman : ""}`}>
                  <span className={styles.messageAvatar}>{human ? <Layers3 size={13} /> : <Bot size={13} />}</span>
                  <div>
                    <div className={styles.messageBubble}>
                      {human ? String(message.content) : <ReactMarkdown>{String(message.content || "")}</ReactMarkdown>}
                    </div>
                    <div className={styles.messageMeta}>{human ? "Bạn" : friendlyProvider(modelSettings.model_provider)}</div>
                  </div>
                </div>
              );
            })}

            {executionPlan && (
              <div className={styles.planCard}>
                {executionPlan.steps.map((step) => (
                  <div key={step.step_number} className={`${styles.planStep} ${step.status === "complete" ? styles.planStepDone : ""}`}>
                    <span className={styles.toolStatus}>
                      {step.status === "complete" ? <CheckCircle2 size={11} /> : <LoaderCircle size={11} className={isBusy ? "animate-spin" : ""} />}
                    </span>
                    <span>{step.step_number}. {step.title}</span>
                  </div>
                ))}
              </div>
            )}

            {toolUpdates.length > 0 && (
              <div className={styles.toolTimeline}>
                {toolUpdates.map((tool, index) => (
                  <div key={`${tool.name}-${index}`} className={styles.toolRow}>
                    <span className={styles.toolStatus}>
                      {tool.status === "complete" ? <CheckCircle2 size={11} /> : <LoaderCircle size={11} className={tool.status === "running" ? "animate-spin" : ""} />}
                    </span>
                    <strong>{tool.name}</strong>
                    <span>{tool.status === "running" ? "đang chạy" : tool.status === "error" ? "lỗi" : "xong"}</span>
                  </div>
                ))}
              </div>
            )}

            {streamingMessage && (
              <div className={styles.message}>
                <span className={styles.messageAvatar}><Bot size={13} /></span>
                <div className={styles.messageBubble}>
                  <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className={styles.assistantError}><AlertCircle size={14} /><span>{error}</span></div>
        )}
      </div>

      <form className={styles.assistantComposer} onSubmit={handleSubmit}>
        <textarea
          className={styles.assistantTextarea}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ví dụ: giao cắt lớp sông với vùng hành chính..."
          rows={2}
          disabled={isBusy}
          data-testid="workbench-chat-input"
        />
        <button
          className={styles.assistantSubmit}
          type={isBusy ? "button" : "submit"}
          onClick={isBusy ? () => void cancelRequest() : undefined}
          disabled={!isBusy && !draft.trim()}
          aria-label={isBusy ? "Dừng tác vụ" : "Gửi lệnh"}
          data-testid="workbench-chat-submit"
        >
          {isBusy ? <Square size={14} /> : <Send size={15} />}
        </button>
      </form>
      <footer className={styles.assistantFooter}>
        <span className={styles.assistantContext}><span className={styles.assistantContextDot} /> {messages.length} tin nhắn · {providerNames.length ? friendlyProvider(modelSettings.model_provider) : "backend"}</span>
        <span>Enter để gửi</span>
      </footer>
    </aside>
  );
}

import { MODE_PROGRAMMING_ID, Mode } from "../../../shared";
import { PreparedCommand } from "../dispatcher";
import { OpenAITokenizer } from "../tokenizers/openai";
import { AnthropicProvider } from "./anthropic";
import { OpenAIProvider } from "./openai";

interface Format {
  system: string;
  user: string;
  first: string;
  stops: string[];
}

export const formats: { [key: string]: Format } = {
  OpenAI: {
    system: "{system_message}",
    user: "{user_message}",
    first: "{system}",
    stops: [],
  },
  Anthropic: {
    system: "{system_message}",
    user: "\n\nHuman: {user_message}\n\nAssistant:",
    first: "{system}{user}",
    stops: ["Human:"],
  },
  Alpaca: {
    system: "{system_message}",
    user: "### Instruction: {user_message}\n\n### Response:",
    first: "{system}\n\n{user}",
    stops: ["### Instruction:"],
  },
  Vicuna: {
    system: "{system_message}",
    user: "USER:\n{user_message}\nASSISTANT:",
    first: "{system}\n\n{user}",
    stops: ["USER:"],
  },
  ChatML: {
    system: "<|im_start|>system\n{system_message}<|im_end|>",
    user: "<|im_start|>user\n{user_message}<|im_end|>\n<|im_start|>assistant\n",
    first: "{system}\n{user}",
    stops: ["<|im_end|>"],
  },
  "Llama 2": {
    system: "<<SYS>>\n{system_message}\n<</SYS>>",
    user: "<s>[INST] {user_message} [/INST]",
    first: "<s>[INST] {system}\n\n{user_message} [/INST]",
    stops: ["</s>"],
    // <s>[INST] <<SYS>>\n{your_system_message}\n<</SYS>>\n\n{user_message_1} [/INST] {model_reply_1}</s><s>[INST] {user_message_2} [/INST]
  },
  "Orca 2": {
    system: "### System:\n{system_message}",
    user: "### User:\n{user_message}\n\n### Response:\n",
    first: "{system}\n\n{user}",
    stops: ["### User:"],
  },
};

export const applyFormat = (format: keyof typeof formats, command: PreparedCommand) => {
  const formatDefinition = formats[format];

  const system = formatDefinition.system.replace("{system_message}", command.system);
  const user = formatDefinition.user.replace("{user_message}", command.message);
  const first = formatDefinition.first.replace("{system}", system).replace("{user}", user);

  return {
    system,
    first,
    user,
  };
};

interface CompletionParam {
  name: string;
  default: string | number | string[];
}

export const providers = {
  OpenAI: {
    instance: OpenAIProvider,
    // https://platform.openai.com/docs/api-reference/chat/create
    completionParams: [
      { name: "n", default: 1 },
      { name: "model", default: "gpt-3.5-turbo-1106" },
      { name: "temperature", default: 0.3 },
      { name: "max_tokens", default: 4096 },
      { name: "frequency_penalty", default: 0 },
      { name: "presence_penalty", default: 0 },
      { name: "top_p", default: 1 },
      { name: "stop", default: [] },
    ] as const,
  },
  Anthropic: {
    instance: AnthropicProvider,
    // https://docs.anthropic.com/claude/reference/complete_post
    completionParams: [
      { name: "max_tokens_to_sample", default: 100_000 },
      { name: "top_k", default: 5 },
      { name: "top_p", default: 0.7 },
      { name: "model", default: "claude-instant-1" },
      { name: "temperature", default: 0.3 },
      // { name: "stop_sequence", default: ["\\n\\nHuman:"] },
    ] as const,
  },
};

export const tokenizers = {
  OpenAI: {
    instance: OpenAITokenizer,
  },
  Llama: {
    instance: OpenAITokenizer,
  },
  Anthropic: {
    instance: OpenAITokenizer,
  },
};

type ProviderCompletionParams<T extends keyof typeof providers> = {
  [K in typeof providers[T]['completionParams'][number]['name']]: 
    typeof providers[T]['completionParams'][number]['default']
};

/**
 * @param provider
 * @returns e.g. { n: 1, model: "gpt-3.5-turbo", temperature: 0.3, max_tokens: 2048 }
 */
export const getProviderCompletionParamDefaults = <T extends keyof typeof providers>(
  provider: T
): ProviderCompletionParams<T> => {
  const params = {} as ProviderCompletionParams<T>;

  providers[provider].completionParams.forEach((param) => {
    params[param.name] = param.default;
  });

  return params;
};

export const DEFAULT_MODE: Mode = {
  label: "Programming",
  id: MODE_PROGRAMMING_ID,
};

export interface APIProvider {
}

export const EXTENSION_SCHEME = "wingman";
